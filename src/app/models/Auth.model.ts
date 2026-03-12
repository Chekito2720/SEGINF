// ─── Permisos disponibles en la app ───────────────────────────────────────────
// Groups
export type Permission =
  | 'groups_view'   | 'group_view'
  | 'groups_edit'   | 'group_edit'
  | 'groups_delete' | 'group_delete'
  | 'groups_add'    | 'group_add'
  // Users
  | 'users_view'    | 'user_view'
  | 'users_edit'    | 'user_edit'
  | 'user_delete'   | 'user_add'
  // Tickets
  | 'tickets_view'  | 'ticket_view'
  | 'tickets_edit'  | 'ticket_edit'
  | 'ticket_delete' | 'tickets_add'  | 'ticket_add';

// ─── Conjuntos de permisos (solo para el panel Admin — botones "Plantilla") ────
// NO se asignan a usuarios. Son atajos de UI para aplicar un conjunto rápido
// al crear/editar un usuario en el panel admin. Los permisos reales de cada
// usuario están definidos individualmente abajo en USERS[].permissions.
export const PERMISSION_SETS: Record<string, Permission[]> = {
  superadmin: [
    'groups_view','group_view','groups_edit','group_edit','groups_delete','group_delete','groups_add','group_add',
    'users_view','user_view','users_edit','user_edit','user_delete','user_add',
    'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add',
  ],
  avanzado: [
    'group_view','group_edit',
    'users_view','user_view',
    'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add',
  ],
  basico: [
    'ticket_view',
    'user_view',
  ],
};

/** @deprecated Usa PERMISSION_SETS */
export const PERMISSION_PROFILES = PERMISSION_SETS;

// ─── Usuarios hardcodeados ────────────────────────────────────────────────────
export interface AppUser {
  id:          number;
  fullName:    string;
  username:    string;
  email:       string;
  password:    string;
  phone:       string;
  birthDate:   string;
  address:     string;
  permissions: Permission[];
  groupIds:    number[];   // grupos a los que pertenece
}

// ─── Grupos hardcodeados ──────────────────────────────────────────────────────
export interface AppGroup {
  id:          number;
  nombre:      string;
  nivel:       string;
  autor:       string;
  integrantes: number;
  tickets:     number;
  descripcion: string;
  color:       string;   // color de fondo para la card del dashboard
  model:       string;   // modelo LLM asignado al grupo
}

export const GROUPS: AppGroup[] = [
  { id: 1, nombre: 'Equipo Dev',  nivel: 'Avanzado',   autor: 'Ana García',   integrantes: 6, tickets: 18, descripcion: 'Desarrollo de software y arquitectura.',  color: '#1e1b4b', model: 'GPT-4o'       },
  { id: 2, nombre: 'Soporte',     nivel: 'Intermedio', autor: 'Carlos López', integrantes: 4, tickets: 32, descripcion: 'Atención y resolución de incidencias.',   color: '#0f2d1f', model: 'Claude Sonnet' },
  { id: 3, nombre: 'UX',          nivel: 'Básico',     autor: 'María Pérez',  integrantes: 3, tickets: 9,  descripcion: 'Diseño de experiencia de usuario.',       color: '#2d1b0f', model: 'Gemini Pro'    },
];

export const USERS: AppUser[] = [
  {
    id: 1, fullName: 'Super Admin', username: 'superadmin', email: 'admin@miapp.com', password: 'Admin@12345',
    phone: '50312345678', birthDate: '1990-01-01', address: 'Oficina Central',
    permissions: [
      'groups_view','group_view','groups_edit','group_edit','groups_delete','group_delete','groups_add','group_add',
      'users_view','user_view','users_edit','user_edit','user_delete','user_add',
      'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add',
    ],
    groupIds: [1, 2, 3],
  },
  {
    id: 2, fullName: 'Ana García', username: 'ana_garcia', email: 'ana@miapp.com', password: 'Usuario@12345',
    phone: '50387654321', birthDate: '1995-06-15', address: 'Calle Ejemplo 123',
    permissions: [
      'group_view','group_edit',
      'users_view','user_view',
      'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add',
    ],
    groupIds: [1, 3],
  },
  {
    id: 3, fullName: 'Carlos López', username: 'carlos_lopez', email: 'carlos@miapp.com', password: 'Carlos@12345',
    phone: '50311112222', birthDate: '1998-03-20', address: 'Avenida Principal 45',
    permissions: [
      'ticket_view',
      'user_view',
    ],
    groupIds: [2],
  },
];

// ─── Tickets ──────────────────────────────────────────────────────────────────
export type TicketStatus   = 'pendiente' | 'en_progreso' | 'hecho' | 'bloqueado';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface Ticket {
  id:           number;
  titulo:       string;
  descripcion:  string;
  status:       TicketStatus;
  priority:     TicketPriority;
  groupId:      number;
  assignedToId: number;     // userId asignado
  createdById:  number;     // userId creador
  createdAt:    string;
  dueDate?:     string;     // fecha límite (opcional)
}

export const TICKETS: Ticket[] = [
  // Grupo 1 - Equipo Dev
  { id:1,  titulo:'Implementar autenticación JWT',    descripcion:'Crear sistema de login con JWT y refresh tokens.',           status:'en_progreso', priority:'alta',    groupId:1, assignedToId:2, createdById:1, createdAt:'2025-03-01', dueDate:'2025-03-20' },
  { id:2,  titulo:'Refactorizar módulo de pagos',     descripcion:'Separar lógica de pagos en servicio independiente.',        status:'pendiente',   priority:'media',   groupId:1, assignedToId:1, createdById:1, createdAt:'2025-03-02', dueDate:'2025-03-25' },
  { id:3,  titulo:'Fix bug en paginación',            descripcion:'La paginación falla con más de 100 registros.',             status:'bloqueado',   priority:'critica', groupId:1, assignedToId:2, createdById:2, createdAt:'2025-03-03', dueDate:'2025-03-10' },
  { id:4,  titulo:'Deploy a producción v2.1',         descripcion:'Desplegar la versión 2.1 al servidor de producción.',       status:'hecho',       priority:'alta',    groupId:1, assignedToId:1, createdById:1, createdAt:'2025-03-04' },
  { id:5,  titulo:'Actualizar dependencias npm',      descripcion:'Actualizar todas las dependencias a sus últimas versiones.', status:'pendiente',   priority:'baja',    groupId:1, assignedToId:2, createdById:1, createdAt:'2025-03-05', dueDate:'2025-04-01' },
  { id:6,  titulo:'Documentar API REST',              descripcion:'Escribir documentación Swagger para todos los endpoints.',  status:'en_progreso', priority:'media',   groupId:1, assignedToId:1, createdById:2, createdAt:'2025-03-06', dueDate:'2025-03-28' },
  // Grupo 2 - Soporte
  { id:7,  titulo:'Cliente no puede iniciar sesión',  descripcion:'Usuario reporta error 403 al intentar autenticarse.',       status:'en_progreso', priority:'critica', groupId:2, assignedToId:3, createdById:1, createdAt:'2025-03-01', dueDate:'2025-03-08' },
  { id:8,  titulo:'Error en factura #4521',           descripcion:'La factura muestra monto incorrecto.',                      status:'pendiente',   priority:'alta',    groupId:2, assignedToId:3, createdById:3, createdAt:'2025-03-02', dueDate:'2025-03-15' },
  { id:9,  titulo:'Solicitud de reembolso',           descripcion:'Procesar reembolso por pedido cancelado.',                  status:'hecho',       priority:'media',   groupId:2, assignedToId:3, createdById:3, createdAt:'2025-03-03' },
  { id:10, titulo:'Actualizar FAQ del portal',        descripcion:'Añadir nuevas preguntas frecuentes al portal de soporte.',  status:'bloqueado',   priority:'baja',    groupId:2, assignedToId:3, createdById:1, createdAt:'2025-03-04', dueDate:'2025-03-30' },
  // Grupo 3 - UX
  { id:11, titulo:'Rediseñar pantalla de onboarding', descripcion:'Mejorar el flujo de bienvenida para nuevos usuarios.',      status:'en_progreso', priority:'alta',    groupId:3, assignedToId:2, createdById:2, createdAt:'2025-03-01', dueDate:'2025-03-22' },
  { id:12, titulo:'Test de usabilidad v3',            descripcion:'Ejecutar pruebas con 5 usuarios reales del nuevo diseño.',  status:'pendiente',   priority:'media',   groupId:3, assignedToId:2, createdById:2, createdAt:'2025-03-02', dueDate:'2025-03-18' },
  { id:13, titulo:'Crear librería de componentes',    descripcion:'Definir tokens de diseño y componentes base.',              status:'hecho',       priority:'alta',    groupId:3, assignedToId:2, createdById:1, createdAt:'2025-03-03' },
];

// ─── Ticket Detail: 7 niveles de prioridad ───────────────────────────────────
export type TicketPriorityExtended =
  | 'minima'   // Mínima
  | 'baja'     // Baja
  | 'normal'   // Normal
  | 'alta'     // Alta
  | 'urgente'  // Urgente
  | 'critica'  // Crítica
  | 'bloqueante'; // Bloqueante

export const PRIORITY_EXTENDED_META: Record<TicketPriorityExtended, {
  label: string; icon: string; color: string; bg: string; rank: number;
}> = {
  minima:     { label:'Mínima',     icon:'pi-angle-double-down', color:'#64748b', bg:'rgba(100,116,139,.14)', rank:1 },
  baja:       { label:'Baja',       icon:'pi-angle-down',        color:'#4ade80', bg:'rgba(74,222,128,.14)',  rank:2 },
  normal:     { label:'Normal',     icon:'pi-minus',             color:'#38bdf8', bg:'rgba(56,189,248,.14)',  rank:3 },
  alta:       { label:'Alta',       icon:'pi-angle-up',          color:'#f59e0b', bg:'rgba(245,158,11,.14)',  rank:4 },
  urgente:    { label:'Urgente',    icon:'pi-angle-double-up',   color:'#fb923c', bg:'rgba(251,146,60,.14)',  rank:5 },
  critica:    { label:'Crítica',    icon:'pi-exclamation-circle',color:'#f87171', bg:'rgba(248,113,113,.14)', rank:6 },
  bloqueante: { label:'Bloqueante', icon:'pi-ban',               color:'#e11d48', bg:'rgba(225,29,72,.16)',   rank:7 },
};

// ─── Comentario ───────────────────────────────────────────────────────────────
export interface TicketComment {
  id:        number;
  ticketId:  number;
  userId:    number;
  text:      string;
  createdAt: string;
}

// ─── Entrada de historial ─────────────────────────────────────────────────────
export type HistoryAction =
  | 'created' | 'status_changed' | 'priority_changed'
  | 'assigned' | 'title_changed' | 'description_changed'
  | 'duedate_changed' | 'comment_added';

export interface TicketHistory {
  id:        number;
  ticketId:  number;
  userId:    number;
  action:    HistoryAction;
  from?:     string;
  to?:       string;
  note?:     string;
  createdAt: string;
}

// ─── Datos iniciales de comentarios e historial ───────────────────────────────
export const TICKET_COMMENTS: TicketComment[] = [
  { id:1, ticketId:1, userId:1, text:'Iniciando implementación. Usaremos jsonwebtoken + bcrypt.',                           createdAt:'2025-03-01T09:00:00' },
  { id:2, ticketId:1, userId:2, text:'He configurado el middleware de verificación. Falta el refresh token.',               createdAt:'2025-03-02T11:30:00' },
  { id:3, ticketId:3, userId:2, text:'Bloqueado por dependencia en el módulo de DB. Necesito acceso al servidor de staging.',createdAt:'2025-03-03T14:00:00' },
  { id:4, ticketId:3, userId:1, text:'Acceso otorgado. Puedes continuar.',                                                  createdAt:'2025-03-03T15:45:00' },
  { id:5, ticketId:7, userId:3, text:'Reproducido el error. El token JWT expira antes de lo esperado.',                    createdAt:'2025-03-01T10:00:00' },
];

export const TICKET_HISTORY: TicketHistory[] = [
  { id:1,  ticketId:1, userId:1, action:'created',          to:'en_progreso',  note:'Ticket creado',                          createdAt:'2025-03-01T08:00:00' },
  { id:2,  ticketId:1, userId:2, action:'status_changed',   from:'pendiente',  to:'en_progreso',                              createdAt:'2025-03-01T09:05:00' },
  { id:3,  ticketId:1, userId:1, action:'assigned',         from:'superadmin', to:'ana_garcia',                               createdAt:'2025-03-01T09:10:00' },
  { id:4,  ticketId:3, userId:2, action:'status_changed',   from:'en_progreso',to:'bloqueado',                                createdAt:'2025-03-03T14:01:00' },
  { id:5,  ticketId:3, userId:1, action:'comment_added',    note:'Acceso otorgado',                                          createdAt:'2025-03-03T15:45:00' },
  { id:6,  ticketId:7, userId:3, action:'status_changed',   from:'pendiente',  to:'en_progreso',                              createdAt:'2025-03-01T10:05:00' },
  { id:7,  ticketId:7, userId:1, action:'priority_changed', from:'alta',       to:'critica',                                  createdAt:'2025-03-01T10:30:00' },
  { id:8,  ticketId:4, userId:1, action:'status_changed',   from:'en_progreso',to:'hecho',       note:'Deploy exitoso v2.1', createdAt:'2025-03-04T18:00:00' },
];