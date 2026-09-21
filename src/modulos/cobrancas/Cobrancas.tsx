import { useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Abas, Botao, CabecalhoTela, Campo, Card, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { hoje, moeda, numero, somarDias } from '../../lib/formato';
import { salvar } from '../../lib/repo';
import { valorAtualizado } from '../../lib/automacoes';
import { ItemCobranca } from './componentes';
import type { Cliente, Cobranca } from '../../lib/tipos';

type Filtro = 'aberta' | 'atrasada' | 'paga' | 'todas';

export function Cobrancas() {
  const cobrancas = useLista<Cobranca>('cobrancas', (c) => c.status !== 'cancelada') ?? [];
  const clientes = useLista<Cliente>('clientes') ?? [];
  const porId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const [filtro, setFiltro] = useState<Filtro>('aberta');
  const [nova, setNova] = useState(false);

  const lista = cobrancas
    .filter((c) => filtro === 'todas' || c.status === filtro)
    .sort((a, b) => (filtro === 'paga' ? b.vencimento.localeCompare(a.vencimento) : a.vencimento.localeCompare(b.vencimento)));
  const aReceber = cobrancas.filter((c) => c.status === 'aberta' || c.status === 'atrasada')
    .reduce((s, c) => s + valorAtualizado(c, porId.get(c.cliente_id)).total, 0);
  const atrasadas = cobrancas.filter((c) => c.status === 'atrasada').length;

  return (
    <>
      <CabecalhoTela titulo="Cobranças" icone={<Receipt size={28} strokeWidth={1.6} />}
        subtitulo={`${moeda(aReceber)} a receber${atrasadas ? `, ${atrasadas} ${atrasadas === 1 ? 'atrasada' : 'atrasadas'}` : ''}`}
        acoes={<Botao variante="primario" onClick={() => setNova(true)}>Nova cobrança</Botao>} />
      <div style={{ marginBottom: 16 }}>
        <Abas<Filtro> abas={[{ id: 'aberta', rotulo: 'A Vencer' }, { id: 'atrasada', rotulo: 'Atrasadas' }, { id: 'paga', rotulo: 'Pagas' }, { id: 'todas', rotulo: 'Todas' }]} ativa={filtro} aoMudar={setFiltro} />
      </div>
      <Card>
        {lista.length ? <div className="lista">{lista.map((c) => <ItemCobranca key={c.id} c={c} cliente={porId.get(c.cliente_id)} />)}</div>
          : <Vazio texto={filtro === 'atrasada' ? 'Nenhuma cobrança atrasada.' : 'Nenhuma cobrança por aqui. Elas são criadas sozinhas a partir dos serviços de cada cliente.'} />}
      </Card>
      <NovaCobranca aberto={nova} aoFechar={() => setNova(false)} clientes={clientes.filter((c) => c.status !== 'encerrado')} />
    </>
  );
}

function NovaCobranca({ aberto, aoFechar, clientes }: { aberto: boolean; aoFechar: () => void; clientes: Cliente[] }) {
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [venc, setVenc] = useState(somarDias(hoje(), 5));
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAvisar();
  const criar = async () => {
    if (!clienteId || !descricao.trim() || numero(valor) <= 0) { setErro('Preencha cliente, descrição e valor.'); return; }
    await salvar<Cobranca>('cobrancas', {
      cliente_id: clienteId, cliente_servico_id: null, lancamento_origem_id: null, descricao: descricao.trim(), valor: numero(valor),
      vencimento: venc, status: venc < hoje() ? 'atrasada' : 'aberta', pago_em: null, valor_pago: null, forma_pagamento: '', lancamento_id: null, referencia: null
    });
    avisar('Cobrança criada');
    setDescricao(''); setValor(''); setErro(null); aoFechar();
  };
  return (
    <Modal titulo="Nova Cobrança" aberto={aberto} aoFechar={aoFechar}
      rodape={<><Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" onClick={criar}>Criar cobrança</Botao></>}>
      <div className="grade-form">
        <Campo rotulo="Cliente" inteiro>
          <select className="entrada" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Escolha o cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Descrição" inteiro erro={erro}><input className="entrada" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Criação de landing page extra" /></Campo>
        <Campo rotulo="Valor"><input className="entrada" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></Campo>
        <Campo rotulo="Vencimento"><input className="entrada" type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
      </div>
    </Modal>
  );
}
