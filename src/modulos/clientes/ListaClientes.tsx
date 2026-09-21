import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, Download } from 'lucide-react';
import { Abas, Botao, CabecalhoTela, Card, Chip, Vazio } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { moeda, semAcento, soDigitos } from '../../lib/formato';
import { exportarLista } from '../../lib/planilhas';
import type { Cliente, ClienteServico, Servico } from '../../lib/tipos';

type Filtro = 'ativo' | 'pausado' | 'encerrado' | 'todos';
export const corStatus = { ativo: 'var(--ok)', pausado: 'var(--atencao)', encerrado: 'var(--texto-secundario)' };

export function ListaClientes() {
  const navegar = useNavigate();
  const clientes = useLista<Cliente>('clientes') ?? [];
  const servicosCli = useLista<ClienteServico>('cliente_servicos', (s) => s.status === 'ativo') ?? [];
  const servicos = useLista<Servico>('servicos') ?? [];
  const [filtro, setFiltro] = useState<Filtro>('ativo');
  const [busca, setBusca] = useState('');
  const [servico, setServico] = useState('');

  const nomeServ = useMemo(() => new Map(servicos.map((s) => [s.id, s.nome])), [servicos]);
  const lista = useMemo(() => {
    const q = semAcento(busca.toLowerCase());
    const d = soDigitos(busca);
    return clientes
      .filter((c) => filtro === 'todos' || c.status === filtro)
      .filter((c) => !servico || servicosCli.some((s) => s.cliente_id === c.id && s.servico_id === servico))
      .filter((c) => !q || semAcento(`${c.nome} ${c.nome_fantasia} ${c.nicho}`.toLowerCase()).includes(q)
        || (d.length >= 3 && (soDigitos(c.telefone + c.whatsapp).includes(d) || soDigitos(c.documento).includes(d))))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [clientes, servicosCli, filtro, busca, servico]);

  const ativos = clientes.filter((c) => c.status === 'ativo').length;
  const exportar = () => exportarLista('clientes', lista.map((c) => ({
    Nome: c.nome, 'Nome Fantasia': c.nome_fantasia, Tipo: c.tipo_pessoa, Documento: c.documento, Responsável: c.responsavel,
    Telefone: c.telefone, WhatsApp: c.whatsapp, 'E-mail': c.email, Cidade: c.cidade, UF: c.uf, Nicho: c.nicho, Status: c.status
  })));

  return (
    <>
      <CabecalhoTela titulo="Clientes" icone={<Users size={28} strokeWidth={1.6} />} subtitulo={`${ativos} ${ativos === 1 ? 'cliente ativo' : 'clientes ativos'}`}
        acoes={<>
          <Botao icone={<Download size={16} />} onClick={exportar} disabled={!lista.length}>Exportar</Botao>
          <Botao variante="primario" onClick={() => navegar('/clientes/novo')}>Cadastrar cliente</Botao>
        </>} />
      <div className="linha" style={{ marginBottom: 16 }}>
        <Abas<Filtro> abas={[{ id: 'ativo', rotulo: 'Ativos' }, { id: 'pausado', rotulo: 'Pausados' }, { id: 'encerrado', rotulo: 'Encerrados' }, { id: 'todos', rotulo: 'Todos' }]} ativa={filtro} aoMudar={setFiltro} />
        <div className="cresce" style={{ minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: 15, opacity: .5 }} />
          <input className="entrada" style={{ paddingLeft: 38 }} placeholder="Buscar por nome, telefone ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="entrada" style={{ width: 'auto' }} value={servico} onChange={(e) => setServico(e.target.value)} aria-label="Filtrar por serviço">
          <option value="">Todos os serviços</option>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      <Card>
        {!lista.length ? (
          <Vazio texto={clientes.length ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente ainda.'}
            acao={!clientes.length && <Botao variante="primario" onClick={() => navegar('/clientes/novo')}>Cadastrar cliente</Botao>} />
        ) : (
          <div className="lista">
            {lista.map((c) => {
              const seus = servicosCli.filter((s) => s.cliente_id === c.id);
              const mensal = seus.filter((s) => s.tipo_cobranca === 'mensal').reduce((a, s) => a + s.valor, 0);
              return (
                <Link key={c.id} to={`/clientes/${c.id}`} className="item">
                  <span className="ponto" style={{ background: corStatus[c.status] }} />
                  <div className="cresce">
                    <div className="titulo">{c.nome}</div>
                    <div className="linha pequeno secundario" style={{ gap: 6, marginTop: 4 }}>
                      {c.nome_fantasia && <span>{c.nome_fantasia}</span>}
                      {seus.map((s) => <Chip key={s.id}>{nomeServ.get(s.servico_id) ?? 'Serviço'}</Chip>)}
                    </div>
                  </div>
                  {mensal > 0 && <span className="num secundario">{moeda(mensal)}/mês</span>}
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
