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

// ─── Perfiles hardcodeados (sin roles, solo permisos) ─────────────────────────
export const PERMISSION_PROFILES: Record<string, Permission[]> = {
  superadmin: [
    'groups_view','group_view','groups_edit','group_edit','groups_delete','group_delete','groups_add','group_add',
    'users_view','user_view','users_edit','user_edit','user_delete','user_add',
    'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add',
  ],
  group_admin: [
    'group_view','group_edit',
    'users_view','user_view',
    'tickets_view','ticket_view','tickets_edit','ticket_edit','ticket_delete','tickets_add','ticket_add',
  ],
  group_member: [
    'ticket_view',
    'user_view',
  ],
};

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
    permissions: PERMISSION_PROFILES['superadmin'],
    groupIds: [1, 2, 3],
  },
  {
    id: 2, fullName: 'Ana García', username: 'ana_garcia', email: 'ana@miapp.com', password: 'Usuario@12345',
    phone: '50387654321', birthDate: '1995-06-15', address: 'Calle Ejemplo 123',
    permissions: PERMISSION_PROFILES['group_admin'],
    groupIds: [1, 3],
  },
  {
    id: 3, fullName: 'Carlos López', username: 'carlos_lopez', email: 'carlos@miapp.com', password: 'Carlos@12345',
    phone: '50311112222', birthDate: '1998-03-20', address: 'Avenida Principal 45',
    permissions: PERMISSION_PROFILES['group_member'],
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