import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Botao, Campo, Modal, useAvisar } from '../../componentes/ui';
import { db } from '../../lib/db';
import { salvar } from '../../lib/repo';
import { numero, semAcento, soDigitos } from '../../lib/formato';
import { CAMPOS_CLIENTES, CAMPOS_LANCAMENTOS, baixarModelo, dataPlanilha, lerPlanilha, mapearAutomatico, type CampoImport } from '../../lib/planilhas';
import type { Categoria, Cliente, Lancamento } from '../../lib/tipos';

type Tipo = 'clientes' | 'lancamentos';
const CAMPOS: Record<Tipo, CampoImport[]> = { clientes: CAMPOS_CLIENTES, lancamentos: CAMPOS_LANCAMENTOS };
const norm = (s: string) => semAcento(String(s ?? '')).toLowerCase().trim();

// Importação de planilha (Excel ou CSV) com ligação de colunas, prévia e verificação de duplicados.
export function Importador({ tipo }: { tipo: Tipo }) {
  const avisar = useAvisar();
  const [dados, setDados] = useState<{ colunas: string[]; linhas: Record<string, any>[] } | null>(null);
  const [mapa, setMapa] = useState<Record<string, string>>({});
  const campos = CAMPOS[tipo];

  const escolher = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = await lerPlanilha(f);
      if (!d.linhas.length) { avisar('A planilha está vazia.'); return; }
      setDados(d);
      setMapa(mapearAutomatico(d.colunas, campos));
    } catch { avisar('Não consegui ler esse arquivo. Use .xlsx ou .csv.'); }
  };

  const valor = (linha: Record<string, any>, campo: string) => (mapa[campo] ? String(linha[mapa[campo]] ?? '').trim() : '');
  const errosDe = (linha: Record<string, any>) => {
    const e: string[] = [];
    for (const c of campos) if (c.obrigatorio && !valor(linha, c.chave)) e.push(`sem ${c.rotulo.toLowerCase()}`);
    if (tipo === 'lancamentos') {
      if (valor(linha, 'data') && !dataPlanilha(valor(linha, 'data'))) e.push('data inválida');
      if (valor(linha, 'valor') && numero(valor(linha, 'valor')) <= 0) e.push('valor inválido');
    }
    return e;
  };

  const importar = async () => {
    if (!dados) return;
    let novos = 0, duplicados = 0, comErro = 0;
    if (tipo === 'clientes') {
      const existentes = (await db.clientes.toArray()).filter((c) => !c.excluido);
      const chaves = new Set(existentes.flatMap((c) => [soDigitos(c.documento), soDigitos(c.whatsapp || c.telefone), norm(c.nome)]).filter(Boolean));
      for (const l of dados.linhas) {
        if (errosDe(l).length) { comErro++; continue; }
        const doc = soDigitos(valor(l, 'documento')), tel = soDigitos(valor(l, 'whatsapp') || valor(l, 'telefone')), nome = valor(l, 'nome');
        if ((doc && chaves.has(doc)) || (tel && chaves.has(tel)) || chaves.has(norm(nome))) { duplicados++; continue; }
        const tipoP = norm(valor(l, 'tipo_pessoa')).startsWith('pf') || doc.length === 11 ? 'PF' : 'PJ';
        await salvar<Cliente>('clientes', {
          tipo_pessoa: tipoP, nome, nome_fantasia: '', documento: valor(l, 'documento'), responsavel: valor(l, 'responsavel'),
          telefone: valor(l, 'telefone'), whatsapp: valor(l, 'whatsapp'), email: valor(l, 'email'), endereco: '', cidade: valor(l, 'cidade'),
          uf: valor(l, 'uf').toUpperCase().slice(0, 2), nicho: valor(l, 'nicho'), origem: valor(l, 'origem'), indicado_por_id: null,
          status: 'ativo', observacoes: valor(l, 'observacoes'), aniversario: null, multa_ativa: false, multa_percentual: 2,
          juros_mensal: 1, aprova_posts: false, lead_id: null
        });
        [doc, tel, norm(nome)].filter(Boolean).forEach((k) => chaves.add(k));
        novos++;
      }
    } else {
      const cats = (await db.categorias.toArray()).filter((c) => !c.excluido) as Categoria[];
      const existentes = (await db.lancamentos.toArray()).filter((x) => !x.excluido);
      const chaves = new Set(existentes.map((x) => `${x.data}|${Number(x.valor).toFixed(2)}|${norm(x.descricao)}`));
      for (const l of dados.linhas) {
        if (errosDe(l).length) { comErro++; continue; }
        const d = dataPlanilha(valor(l, 'data'))!;
        const v = Math.abs(numero(valor(l, 'valor')));
        const desc = valor(l, 'descricao');
        const chave = `${d}|${v.toFixed(2)}|${norm(desc)}`;
        if (chaves.has(chave)) { duplicados++; continue; }
        const tipoL = norm(valor(l, 'tipo')).startsWith('e') ? 'entrada' : 'saida';
        const cart = norm(valor(l, 'carteira')).startsWith('p') ? 'pessoal' : 'negocio';
        const cat = cats.find((c) => c.carteira === cart && c.tipo === tipoL && norm(c.nome) === norm(valor(l, 'categoria')));
        await salvar<Lancamento>('lancamentos', {
          carteira: cart, categoria_id: cat?.id ?? null, tipo: tipoL, descricao: desc, valor: v, data: d,
          status: norm(valor(l, 'status')).startsWith('prev') ? 'previsto' : 'pago', forma_pagamento: '', cliente_id: null,
          cobranca_id: null, recorrente: false, recorrencia_origem_id: null, referencia: null, reembolsado_em: null
        });
        chaves.add(chave);
        novos++;
      }
    }
    avisar(`${novos} importados, ${duplicados} duplicados ignorados${comErro ? `, ${comErro} com erro` : ''}`);
    setDados(null);
  };

  const validas = dados ? dados.linhas.filter((l) => !errosDe(l).length).length : 0;

  return (
    <>
      <div className="linha">
        <label className="btn btn-secundario vidro-pilula" style={{ cursor: 'pointer' }}>
          <Upload size={16} /> Importar {tipo === 'clientes' ? 'clientes' : 'lançamentos'}
          <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <Botao variante="fantasma" onClick={() => baixarModelo(tipo, campos)}>Baixar planilha modelo</Botao>
      </div>
      <Modal titulo={`Importar ${tipo === 'clientes' ? 'Clientes' : 'Lançamentos'}`} aberto={!!dados} aoFechar={() => setDados(null)}
        rodape={<><Botao variante="fantasma" onClick={() => setDados(null)}>Cancelar</Botao><Botao variante="primario" onClick={importar} disabled={!validas}>Importar {validas} {validas === 1 ? 'linha' : 'linhas'}</Botao></>}>
        {dados && (
          <>
            <p className="secundario" style={{ marginBottom: 14 }}>Ligue cada campo do Atlas à coluna certa da sua planilha.</p>
            <div className="grade-form">
              {campos.map((c) => (
                <Campo key={c.chave} rotulo={`${c.rotulo}${c.obrigatorio ? ' *' : ''}`}>
                  <select className="entrada" value={mapa[c.chave] ?? ''} onChange={(e) => setMapa({ ...mapa, [c.chave]: e.target.value })}>
                    <option value="">Não importar</option>{dados.colunas.map((col) => <option key={col}>{col}</option>)}
                  </select>
                </Campo>
              ))}
            </div>
            <h3 className="subtitulo" style={{ margin: '20px 0 8px' }}>Prévia</h3>
            <div className="rolagem-x">
              <table className="tabela">
                <thead><tr>{campos.filter((c) => mapa[c.chave]).map((c) => <th key={c.chave}>{c.rotulo}</th>)}<th>Situação</th></tr></thead>
                <tbody>
                  {dados.linhas.slice(0, 8).map((l, i) => {
                    const e = errosDe(l);
                    return <tr key={i}>{campos.filter((c) => mapa[c.chave]).map((c) => <td key={c.chave}>{valor(l, c.chave)}</td>)}<td className={e.length ? 'negativo' : 'positivo'}>{e.length ? e.join(', ') : 'OK'}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <p className="pequeno secundario" style={{ marginTop: 8 }}>{dados.linhas.length} linhas no arquivo, {validas} prontas para importar. Duplicados são ignorados.</p>
          </>
        )}
      </Modal>
    </>
  );
}
