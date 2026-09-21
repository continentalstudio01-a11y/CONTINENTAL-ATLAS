import {
  LayoutDashboard, CalendarDays, ListChecks, Users, Filter, Wallet, BarChart3, Receipt, Target, FileText,
  FileSignature, ClipboardList, FileBarChart, Image as ImageIcon, Globe, KeyRound, Settings, HeartHandshake,
  Clock, UserCog, Bell, type LucideIcon
} from 'lucide-react';

export interface Secao {
  rota: string;
  rotulo: string;
  icone: LucideIcon;
  principal?: boolean;
  fase?: number;
  resumo?: string;
  secaoEspec?: string;
}

// Seções do Atlas — Todas as fases construídas e ativas.
export const SECOES: Secao[] = [
  { rota: '/', rotulo: 'Painel', icone: LayoutDashboard, principal: true },
  { rota: '/agenda', rotulo: 'Agenda', icone: CalendarDays, principal: true },
  { rota: '/tarefas', rotulo: 'Tarefas', icone: ListChecks, principal: true },
  { rota: '/clientes', rotulo: 'Clientes', icone: Users, principal: true },
  { rota: '/funil', rotulo: 'Funil', icone: Filter, principal: true },
  { rota: '/financeiro', rotulo: 'Financeiro', icone: Wallet, principal: true },
  { rota: '/campanhas', rotulo: 'Campanhas', icone: BarChart3, principal: true },
  { rota: '/horas', rotulo: 'Horas & Lucro', icone: Clock },
  { rota: '/terceirizados', rotulo: 'Terceirizados', icone: UserCog },
  { rota: '/cobrancas', rotulo: 'Cobranças', icone: Receipt },
  { rota: '/metas', rotulo: 'Metas', icone: Target },
  { rota: '/propostas', rotulo: 'Propostas', icone: FileText },
  { rota: '/contratos', rotulo: 'Contratos', icone: FileSignature },
  { rota: '/briefings', rotulo: 'Briefings', icone: ClipboardList },
  { rota: '/satisfacao', rotulo: 'Satisfação & NPS', icone: HeartHandshake },
  { rota: '/relatorios', rotulo: 'Relatórios', icone: FileBarChart },
  { rota: '/conteudo', rotulo: 'Conteúdo', icone: ImageIcon },
  { rota: '/sites', rotulo: 'Projetos de Site', icone: Globe },
  { rota: '/cofre', rotulo: 'Cofre de Acessos', icone: KeyRound },
  { rota: '/notificacoes', rotulo: 'Notificações', icone: Bell },
  { rota: '/configuracoes', rotulo: 'Configurações', icone: Settings }
];

export const NAV_CELULAR = ['/', '/agenda', '/clientes', '/financeiro'];
