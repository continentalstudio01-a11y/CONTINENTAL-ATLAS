import { useState } from 'react';
import { Calendar, Clock, CheckCircle2, User, Phone, Mail, Building, Sparkles, Send, ExternalLink } from 'lucide-react';
import { Botao, Campo } from '../../componentes/ui';
import { salvar } from '../../lib/repo';
import { novoId } from '../../lib/ids';
import { data, hoje, somarDias } from '../../lib/formato';
import type { Evento } from '../../lib/tipos';

const HORARIOS_DISPONIVEIS = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
];

const MOTIVOS = [
  'Diagnóstico Gratuito de Tráfego Pago & Anúncios',
  'Apresentação de Proposta Comercial',
  'Reunião de Alinhamento e Estratégia',
  'Criação de Site / Landing Page',
  'Outro Assunto'
];

export function AgendamentoPublico() {
  const [diaSel, setDiaSel] = useState(somarDias(hoje(), 1));
  const [horaSel, setHoraSel] = useState('14:00');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Próximos 14 dias úteis para escolha
  const diasOpcoes = Array.from({ length: 14 }).map((_, i) => somarDias(hoje(), i + 1));

  const agendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      alert('Por favor, informe seu nome e WhatsApp.');
      return;
    }

    setEnviando(true);
    try {
      const inicio = `${diaSel}T${horaSel}:00-03:00`;
      const fimHora = String(Number(horaSel.slice(0, 2)) + 1).padStart(2, '0') + horaSel.slice(2);
      const fim = `${diaSel}T${fimHora}:00-03:00`;

      // 1. Salvar evento na Agenda do Atlas
      const eventoId = novoId();
      await salvar<Evento>('eventos', {
        id: eventoId,
        titulo: `Reunião com ${nome} (${empresa || 'Novo Lead'})`,
        tipo: 'reuniao',
        inicio,
        fim,
        dia_inteiro: false,
        local_link: 'Google Meet / WhatsApp',
        descricao: `Motivo: ${motivo}\nWhatsApp: ${telefone}\nE-mail: ${email}\nEmpresa: ${empresa}`,
        cliente_id: null,
        lead_id: null,
        recorrencia: 'nenhuma',
        lembretes: [15, 60],
        automatico: false,
        origem_tabela: null,
        origem_id: null,
        google_event_id: null,
        sync_pendente: true
      });

      // 2. Salvar lead no Funil de Vendas do Atlas
      try {
        const leads = JSON.parse(localStorage.getItem('atlas_leads') || '[]');
        const novoLead = {
          id: novoId(),
          nome,
          empresa,
          telefone,
          whatsapp: telefone,
          email,
          cidade: '',
          nicho: 'Geral',
          origem: 'Agendamento Público',
          etapa: 'reuniao',
          valor_estimado: 0,
          motivo_perda: null,
          pontuacao: 90,
          chave_externa: null,
          dados_externos: {},
          proximo_contato: diaSel,
          observacoes: `Agendou reunião para ${data(diaSel)} às ${horaSel} pelo link público. Motivo: ${motivo}`,
          cliente_id: null,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          excluido: false
        };
        localStorage.setItem('atlas_leads', JSON.stringify([novoLead, ...leads]));
      } catch {}

      setSucesso(true);
    } catch {
      alert('Erro ao agendar reunião. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (sucesso) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 520, width: '100%', padding: '40px 28px', borderRadius: 24, textAlign: 'center' }}>
          <CheckCircle2 size={56} className="positivo" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 24, marginBottom: 12 }}>Reunião Agendada com Sucesso!</h2>
          <p style={{ fontSize: 16, marginBottom: 16 }}>
            Perfeito, <strong>{nome}</strong>! Nosso encontro está confirmado para o dia <strong>{data(diaSel)}</strong> às <strong>{horaSel}</strong>.
          </p>
          <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14, textAlign: 'left', marginBottom: 20 }}>
            <p className="pequeno secundario">Assunto:</p>
            <p><strong>{motivo}</strong></p>
            <p className="pequeno secundario" style={{ marginTop: 8 }}>Local:</p>
            <p>Online via <strong>Google Meet / WhatsApp</strong></p>
          </div>
          <p className="pequeno secundario">
            Nossa equipe da <strong>Continental MKT</strong> entrará em contato pelo seu WhatsApp (<strong>{telefone}</strong>) para enviar o link da sala.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '36px 16px', maxWidth: 660, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: 'var(--vidro-pilula)', border: '1px solid var(--vidro-borda)', marginBottom: 16 }}>
          <Sparkles size={18} className="destaque" />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Continental MKT</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Agende sua Reunião Estratégica
        </h1>
        <p className="secundario" style={{ fontSize: 15 }}>
          Escolha o melhor dia e horário na nossa agenda para conversarmos sobre o crescimento do seu negócio.
        </p>
      </div>

      <form onSubmit={agendar} className="coluna" style={{ gap: 18 }}>
        {/* Escolha do Dia */}
        <div className="vidro-painel" style={{ padding: '20px', borderRadius: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 12 }}>
            1. Selecione o Dia da Reunião
          </label>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {diasOpcoes.map(dia => {
              const selecionado = diaSel === dia;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => setDiaSel(dia)}
                  style={{
                    flex: '0 0 88px',
                    padding: '12px 8px',
                    borderRadius: 14,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: selecionado ? '2px solid var(--destaque)' : '1px solid var(--vidro-borda)',
                    background: selecionado ? 'var(--destaque)' : 'var(--vidro-painel-a)',
                    color: selecionado ? '#fff' : 'inherit'
                  }}
                >
                  <p className="pequeno" style={{ opacity: selecionado ? 1 : 0.8 }}>
                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(new Date(`${dia}T12:00:00Z`)).toUpperCase()}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 600, margin: '2px 0' }}>
                    {dia.slice(8, 10)}
                  </p>
                  <p className="pequeno" style={{ opacity: selecionado ? 1 : 0.8 }}>
                    {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${dia}T12:00:00Z`))}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Escolha do Horário */}
        <div className="vidro-painel" style={{ padding: '20px', borderRadius: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 12 }}>
            2. Selecione o Horário Disponível (Horário de Brasília)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {HORARIOS_DISPONIVEIS.map(hora => {
              const selecionado = horaSel === hora;
              return (
                <button
                  key={hora}
                  type="button"
                  onClick={() => setHoraSel(hora)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: selecionado ? '2px solid var(--destaque)' : '1px solid var(--vidro-borda)',
                    background: selecionado ? 'var(--destaque)' : 'var(--vidro-painel-a)',
                    color: selecionado ? '#fff' : 'inherit'
                  }}
                >
                  <Clock size={13} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                  {hora}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dados do Participante */}
        <div className="vidro-painel" style={{ padding: '20px', borderRadius: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 14 }}>
            3. Seus Dados de Contato
          </label>
          <div className="coluna" style={{ gap: 12 }}>
            <Campo rotulo="Seu Nome Completo *">
              <input className="entrada" required placeholder="Como podemos te chamar?" value={nome} onChange={e => setNome(e.target.value)} />
            </Campo>

            <div className="grade grade-2">
              <Campo rotulo="Seu WhatsApp com DDD *">
                <input className="entrada" required placeholder="(99) 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value)} />
              </Campo>
              <Campo rotulo="Seu E-mail">
                <input className="entrada" type="email" placeholder="nome@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
              </Campo>
            </div>

            <div className="grade grade-2">
              <Campo rotulo="Nome da sua Empresa / Negócio">
                <input className="entrada" placeholder="Ex: Pizzaria Bella, Clínica Vida..." value={empresa} onChange={e => setEmpresa(e.target.value)} />
              </Campo>
              <Campo rotulo="Qual é o objetivo principal da reunião?">
                <select className="entrada" value={motivo} onChange={e => setMotivo(e.target.value)}>
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Campo>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="btn btn-primario"
          style={{ width: '100%', padding: '18px', fontSize: 17, justifyContent: 'center' }}
        >
          <Send size={18} />
          {enviando ? 'Confirmando Agendamento...' : `Confirmar Reunião para ${data(diaSel)} às ${horaSel}`}
        </button>
      </form>
    </div>
  );
}
