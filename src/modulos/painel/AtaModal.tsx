import { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal, Campo, Botao, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { novoId } from '../../lib/ids';
import { salvar } from '../../lib/repo';
import { hoje } from '../../lib/formato';
import type { Cliente, Tarefa } from '../../lib/tipos';

export function AtaModal({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  const [clienteId, setClienteId] = useState('');
  const [prazo, setPrazo] = useState(hoje());
  const [textoAta, setTextoAta] = useState('');

  const processarAta = async () => {
    if (!textoAta.trim()) {
      avisar('Por favor, digite a ata da reunião.');
      return;
    }

    const linhas = textoAta.split('\n');
    const tarefasCriadas: string[] = [];

    for (const linha of linhas) {
      const l = linha.trim();
      if (l.startsWith('*') || l.startsWith('- [ ]') || l.startsWith('- *')) {
        const titulo = l.replace(/^(\*|\-\s*\[\s*\]|\-\s*\*)\s*/, '').trim();
        if (titulo) {
          const novaTarefa: Tarefa = {
            id: novoId(),
            titulo,
            descricao: `Criada automaticamente a partir da ata de reunião (${hoje()})`,
            prazo: prazo || null,
            prioridade: 'media',
            status: 'aberta',
            cliente_id: clienteId || null,
            origem: 'sistema',
            modelo_id: null,
            referencia: null,
            ordem: 0,
            concluida_em: null,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            excluido: false,
          };
          await salvar<Tarefa>('tarefas', novaTarefa);
          tarefasCriadas.push(titulo);
        }
      }
    }

    if (tarefasCriadas.length > 0) {
      avisar(`Sucesso! ${tarefasCriadas.length} tarefa(s) gerada(s) da ata.`);
      setTextoAta('');
      aoFechar();
    } else {
      avisar('Nenhuma tarefa marcada. Comece as linhas com asterisco (*) para virarem tarefas.');
    }
  };

  return (
    <Modal
      titulo="Ata de Reunião → Tarefas Automáticas"
      aberto={aberto}
      aoFechar={aoFechar}
      rodape={
        <div className="linha" style={{ gap: 8 }}>
          <Botao onClick={aoFechar} variante="fantasma">Cancelar</Botao>
          <Botao variante="primario" onClick={processarAta}>
            <Check size={16} /> Extrair & Criar Tarefas
          </Botao>
        </div>
      }
    >
      <div className="coluna" style={{ gap: 14 }}>
        <p className="pequeno secundario">
          Escreva a ata da reunião. Cada linha que começar com <strong>*</strong> (asterisco) será automaticamente convertida em uma tarefa com cliente e prazo definidos!
        </p>
        <div className="grade grade-2">
          <Campo rotulo="Cliente (opcional)">
            <select className="entrada" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Nenhum / Agência interna</option>
              {clientes.filter(c => c.status === 'ativo').map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Prazo padrão para as tarefas">
            <input className="entrada" type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
          </Campo>
        </div>
        <Campo rotulo="Ata da Reunião" acao={<AssistenteTexto valor={textoAta} aoCorrigir={setTextoAta} />}>
          <textarea
            className="entrada"
            rows={8}
            value={textoAta}
            onChange={e => setTextoAta(e.target.value)}
            placeholder={`Reunião de alinhamento com cliente:\n- Foi discutido o aumento de verba para Black Friday\n* Criar criativos em carrossel para oferta principal\n* Subir campanha de captação de leads na nova BM\n- Cliente gostou do relatório do mês passado\n* Enviar link de aprovação até sexta-feira`}
          />
        </Campo>
      </div>
    </Modal>
  );
}
