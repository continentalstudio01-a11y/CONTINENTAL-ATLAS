import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, Download, FileText, Upload } from 'lucide-react';
import { Abas, Botao, CabecalhoTela, Card, Chip, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { moeda, semAcento, soDigitos } from '../../lib/formato';
import { exportarLista } from '../../lib/planilhas';
import type { Cliente, ClienteServico, Servico } from '../../lib/tipos';

type Filtro = 'ativo' | 'pausado' | 'encerrado' | 'todos';
export const corStatus = { ativo: 'var(--ok)', pausado: 'var(--atencao)', encerrado: 'var(--texto-secundario)' };

export function ListaClientes() {
  const navegar = useNavigate();
  const avisar = useAvisar();
  const clientes = useLista<Cliente>('clientes') ?? [];
  const servicosCli = useLista<ClienteServico>('cliente_servicos', (s) => s.status === 'ativo') ?? [];
  const servicos = useLista<Servico>('servicos') ?? [];
  const [filtro, setFiltro] = useState<Filtro>('ativo');
  const [busca, setBusca] = useState('');
  const [servico, setServico] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const inputTxtRef = useRef<HTMLInputElement>(null);

  const processarArquivo = (file: File) => {
    if (!file.name.match(/\.(txt|md|csv)$/i) && file.type !== 'text/plain') {
      avisar('Arquivo inválido. Por favor, envie um arquivo .txt');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const texto = e.target?.result as string;
      if (texto) {
        navegar('/clientes/novo', { state: { textoImportado: texto } });
      }
    };
    reader.readAsText(file, 'utf-8');
  };

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
      <input
        ref={inputTxtRef}
        type="file"
        accept=".txt,.md,.csv,text/plain"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processarArquivo(f); e.target.value = ''; }}
      />

      <CabecalhoTela
        titulo="Clientes"
        icone={<Users size={28} strokeWidth={1.6} />}
        subtitulo={`${ativos} ${ativos === 1 ? 'cliente ativo' : 'clientes ativos'}`}
        acoes={<>
          <Botao icone={<Download size={16} />} onClick={exportar} disabled={!lista.length}>Exportar</Botao>
          <Botao icone={<FileText size={16} />} onClick={() => inputTxtRef.current?.click()} title="Importar cliente a partir de arquivo .txt">
            📄 Importar .txt
          </Botao>
          <Botao variante="primario" onClick={() => navegar('/clientes/novo')}>Cadastrar cliente</Botao>
        </>}
      />

      {/* Caixa de Arrastar e Soltar .txt diretamente na tela de Clientes */}
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const f = e.dataTransfer.files[0];
          if (f) processarArquivo(f);
        }}
        onClick={() => inputTxtRef.current?.click()}
        style={{
          border: `2px dashed ${arrastando ? 'var(--primario)' : 'var(--vidro-borda)'}`,
          borderRadius: 12,
          padding: '12px 18px',
          background: arrastando ? 'rgba(var(--primario-rgb, 0,120,255), 0.08)' : 'var(--vidro-painel)',
          cursor: 'pointer',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transition: 'all 0.2s',
        }}
      >
        <FileText size={24} style={{ color: 'var(--texto-secundario)', flexShrink: 0 }} />
        <div style={{ fontSize: 13 }}>
          <strong>{arrastando ? '📂 Solte o arquivo .txt aqui para importar!' : '📄 Arraste o arquivo .txt do cliente aqui (ou clique)'}</strong>
          <span className="secundario" style={{ marginLeft: 8, fontSize: 12 }}>
            — Extrai e preenche os dados do cliente automaticamente.
          </span>
        </div>
      </div>
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
