import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, MessageCircle, Check, Undo2, Copy } from 'lucide-react';
import { Botao, BotaoIcone, Campo, Chip, Modal, useAvisar } from '../../componentes/ui';
import { useConfig } from '../../lib/hooks';
import { data, hoje, moeda, numero } from '../../lib/formato';
import { payloadPix, qrDoPix } from '../../lib/pix';
import { linkWhatsApp, msgCobranca } from '../../lib/mensagens';
import { desfazerPagamento, pagarCobranca, valorAtualizado } from '../../lib/automacoes';
import type { Cliente, Cobranca } from '../../lib/tipos';

const rotuloStatus: Record<Cobranca['status'], [string, 'ok' | 'atencao' | 'erro' | undefined]> = {
  aberta: ['A vencer', undefined], atrasada: ['Atrasada', 'erro'], paga: ['Paga', 'ok'], cancelada: ['Cancelada', undefined]
};

import { carregarChavesPix, type ChavePixRegistro } from '../../lib/chavesPix';

export function usePix(valor: number, txid: string, chavePersonalizada?: ChavePixRegistro | null) {
  const cfg = useConfig();
  const chave = chavePersonalizada || null;
  const pronto = chave ? !!(chave.chave && chave.nome_recebedor && chave.cidade) : !!(cfg?.pix_chave && cfg.pix_nome && cfg.pix_cidade);
  const payload = pronto
    ? payloadPix({
        chave: chave ? chave.chave : cfg!.pix_chave,
        nome: chave ? chave.nome_recebedor : cfg!.pix_nome,
        cidade: chave ? chave.cidade : cfg!.pix_cidade,
        valor,
        txid
      })
    : null;
  return { pronto, payload };
}

export function ModalPix({ aberto, aoFechar, valor, txid, titulo = 'Pix' }: { aberto: boolean; aoFechar: () => void; valor: number; txid: string; titulo?: string }) {
  const [chaves, setChaves] = useState<ChavePixRegistro[]>([]);
  const [chaveSel, setChaveSel] = useState<ChavePixRegistro | null>(null);

  useEffect(() => {
    if (aberto) {
      const lista = carregarChavesPix();
      setChaves(lista);
      const padrao = lista.find(c => c.padrao) || lista[0] || null;
      setChaveSel(padrao);
    }
  }, [aberto]);

  const { pronto, payload } = usePix(valor, txid, chaveSel);
  const [qr, setQr] = useState<string | null>(null);
  const avisar = useAvisar();

  useEffect(() => { if (aberto && payload) qrDoPix(payload).then(setQr); }, [aberto, payload]);
  const copiar = async () => { if (payload) { await navigator.clipboard.writeText(payload); avisar('Código Pix copiado!'); } };

  return (
    <Modal titulo={titulo} aberto={aberto} aoFechar={aoFechar}
      rodape={pronto ? <Botao variante="primario" icone={<Copy size={16} />} onClick={copiar}>Copiar código</Botao> : undefined}>
      {!pronto ? (
        <div className="vazio">
          <p>Para gerar Pix, cadastre uma chave em Configurações.</p>
          <Link className="btn btn-secundario vidro-pilula" to="/configuracoes" onClick={aoFechar}>Abrir configurações do Pix</Link>
        </div>
      ) : (
        <div className="coluna" style={{ alignItems: 'center', gap: 12 }}>
          {chaves.length > 1 && (
            <div className="linha entre" style={{ width: '100%', maxWidth: 360, gap: 8 }}>
              <span className="pequeno secundario" style={{ flex: 'none' }}>Receber em:</span>
              <select className="entrada pequeno" value={chaveSel?.id || ''} onChange={e => setChaveSel(chaves.find(c => c.id === e.target.value) || null)}>
                {chaves.map(c => (
                  <option key={c.id} value={c.id}>{c.apelido} ({c.chave})</option>
                ))}
              </select>
            </div>
          )}
          <p className="kpi-mini">{moeda(valor)}</p>
          {qr && <img src={qr} alt="QR Code do Pix" style={{ width: 240, height: 240, borderRadius: 16, background: '#fff', padding: 8 }} />}
          <div className="pequeno secundario" style={{ textAlign: 'center' }}>
            Recebedor: <strong>{chaveSel ? chaveSel.nome_recebedor : ''}</strong> · Chave: <code>{chaveSel ? chaveSel.chave : ''}</code>
          </div>
          <textarea className="entrada pequeno" readOnly value={payload ?? ''} rows={3} style={{ fontFamily: 'ui-monospace, monospace', width: '100%' }} />
        </div>
      )}
    </Modal>
  );
}

export function ModalPagar({ cobranca, aoFechar, valorSugerido }: { cobranca: Cobranca | null; aoFechar: () => void; valorSugerido?: number }) {
  const [dataPg, setDataPg] = useState(hoje());
  const [valor, setValor] = useState('');
  const [forma, setForma] = useState('Pix');
  const avisar = useAvisar();
  useEffect(() => { if (cobranca) { setDataPg(hoje()); setValor(String(valorSugerido ?? cobranca.valor).replace('.', ',')); } }, [cobranca, valorSugerido]);
  if (!cobranca) return null;
  const confirmar = async () => {
    await pagarCobranca(cobranca, { data: dataPg, valor: numero(valor), forma });
    avisar('Cobrança marcada como paga');
    aoFechar();
  };
  return (
    <Modal titulo="Marcar como Paga" aberto={!!cobranca} aoFechar={aoFechar}
      rodape={<><Botao variante="fantasma" onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" onClick={confirmar}>Marcar como paga</Botao></>}>
      <p className="secundario" style={{ marginBottom: 14 }}>{cobranca.descricao}</p>
      <div className="grade-form">
        <Campo rotulo="Data do pagamento"><input className="entrada" type="date" value={dataPg} onChange={(e) => setDataPg(e.target.value)} /></Campo>
        <Campo rotulo="Valor recebido"><input className="entrada" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo rotulo="Forma de pagamento" inteiro>
          <select className="entrada" value={forma} onChange={(e) => setForma(e.target.value)}>
            {['Pix', 'Boleto', 'Cartão', 'Transferência', 'Dinheiro'].map((f) => <option key={f}>{f}</option>)}
          </select>
        </Campo>
      </div>
    </Modal>
  );
}

export function ItemCobranca({ c, cliente, mostrarCliente = true }: { c: Cobranca; cliente?: Cliente | null; mostrarCliente?: boolean }) {
  const [pix, setPix] = useState(false);
  const [pagar, setPagar] = useState<Cobranca | null>(null);
  const avisar = useAvisar();
  const atual = valorAtualizado(c, cliente);
  const { payload } = usePix(atual.total, c.id.replace(/-/g, '').slice(0, 25));
  const [rotulo, cor] = rotuloStatus[c.status];
  const aberta = c.status === 'aberta' || c.status === 'atrasada';
  const zap = () => {
    const numeroZap = cliente?.whatsapp || cliente?.telefone;
    if (!numeroZap) { avisar('Cadastre o WhatsApp do cliente para enviar a cobrança.'); return; }
    window.open(linkWhatsApp(numeroZap, msgCobranca(c, cliente, atual.total, payload, atual)), '_blank');
  };
  return (
    <div className={`item ${c.status === 'atrasada' ? 'atrasado' : ''}`} style={{ cursor: 'default' }}>
      <div className="cresce">
        <div className="titulo">{c.descricao}</div>
        <div className="linha pequeno secundario" style={{ gap: 6, marginTop: 4 }}>
          {mostrarCliente && cliente && <Link to={`/clientes/${cliente.id}`}>{cliente.nome}</Link>}
          <span>{c.status === 'paga' ? `Paga em ${data(c.pago_em)}` : `Vence em ${data(c.vencimento)}`}</span>
          <Chip cor={cor}>{rotulo}</Chip>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num" style={{ fontWeight: 500 }}>{moeda(c.status === 'paga' ? c.valor_pago ?? c.valor : atual.total)}</div>
        {atual.total !== c.valor && aberta && <div className="pequeno secundario">original {moeda(c.valor)}</div>}
      </div>
      <div className="linha" style={{ gap: 2, flexWrap: 'nowrap' }}>
        {aberta && <BotaoIcone rotulo="Gerar Pix" onClick={() => setPix(true)}><QrCode size={19} strokeWidth={1.7} /></BotaoIcone>}
        {aberta && <BotaoIcone rotulo="Enviar pelo WhatsApp" onClick={zap}><MessageCircle size={19} strokeWidth={1.7} /></BotaoIcone>}
        {aberta && <BotaoIcone rotulo="Marcar como paga" onClick={() => setPagar(c)}><Check size={19} strokeWidth={1.7} /></BotaoIcone>}
        {c.status === 'paga' && <BotaoIcone rotulo="Desfazer pagamento" onClick={async () => { await desfazerPagamento(c); avisar('Pagamento desfeito'); }}><Undo2 size={18} strokeWidth={1.7} /></BotaoIcone>}
      </div>
      <ModalPix aberto={pix} aoFechar={() => setPix(false)} valor={atual.total} txid={c.id.replace(/-/g, '').slice(0, 25)} titulo="Pix da Cobrança" />
      <ModalPagar cobranca={pagar} aoFechar={() => setPagar(null)} valorSugerido={atual.total} />
    </div>
  );
}
