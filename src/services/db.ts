import { invoke } from '@tauri-apps/api/core';
import { seedDemoDataIfEmpty } from './mockSeedData';

// Interfaces para os tipos do banco de dados
export interface ProfessionalConfig {
  name: string;
  crp: string;
  contact: string;
  autoLockTime: number; // em minutos
  theme: 'dark' | 'light';
}

export interface Patient {
  id: number;
  name: string;
  cpf: string;
  birth_date: string;
  phone: string;
  address: string;
  emergency_contact: string;
  created_at: string;
  status: string; // 'FILA_ESPERA' | 'AVALIACAO_INICIAL' | 'EM_TERAPIA' | 'PREPARACAO_ALTA' | 'ALTA'
  billing_model: 'AVULSO' | 'PACOTE';
  sessions_remaining: number;
  package_price: number;
  session_price?: number | null;
  psychiatrist_contact?: string;
  medical_conditions?: string;
  kanban_order?: number;
}

export interface DailyTask {
  id: number;
  title: string;
  time: string;
  done: number; // 0 ou 1
  date: string;
  important?: number; // 0 ou 1
}

export interface Evolution {
  id: number;
  patient_id: number;
  date: string;
  title: string;
  content: string;
  created_at: string;
}

export interface Attachment {
  id: number;
  patient_id: number;
  name: string;
  mime_type: string;
  data: string; // base64 string
  created_at: string;
}

export interface ClinicalTool {
  id: number;
  patient_id: number;
  type: 'RPD' | 'CHAIN';
  data: string; // JSON string
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutos
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'ABSENT';
  notes: string;
  custom_price?: number | null;
}

export interface Transaction {
  id: number;
  patient_id: number | null;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status?: string; // 'PENDING' | 'CONFIRMED'
}

// Verifica se está rodando no ambiente Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

// Verifica se está na versão pública demonstrativa (GitHub Pages)
export const isDemoWeb = () => {
  return typeof window !== 'undefined' && (
    window.location.hostname.includes('github.io') ||
    window.location.search.includes('demo=true')
  );
};

// --- MOCK LOCALSTORAGE DATABASE (Para Web Fallback) ---
const mockDb = {
  get: (key: string, defaultValue: any) => {
    const val = localStorage.getItem(`acaua_${key}`) || localStorage.getItem(`psi_crm_${key}`);
    return val ? JSON.parse(val) : defaultValue;
  },
  set: (key: string, value: any) => {
    localStorage.setItem(`acaua_${key}`, JSON.stringify(value));
  }
};

// Inicializa dados mock apenas se estiver explicitamente na versão demo pública (ex: GitHub Pages)
if (!isTauri()) {
  if (isDemoWeb()) {
    seedDemoDataIfEmpty();
  } else if (localStorage.getItem('acaua_demo_seeded_v5')) {
    // Remove dados fakes que foram gerados no ambiente local durante os testes
    const demoKeys = [
      'master_password', 'config', 'patients', 'evolutions', 'attachments', 
      'clinical_tools', 'appointments', 'finance', 'daily_tasks', 'notes', 
      'theme', 'tour_done', 'demo_seeded_v1', 'demo_seeded_v2', 'demo_seeded_v3', 
      'demo_seeded_v4', 'demo_seeded_v5'
    ];
    demoKeys.forEach(k => {
      localStorage.removeItem(`acaua_${k}`);
      localStorage.removeItem(`psi_crm_${k}`);
    });
  }
}

// Classe de serviço do banco de dados
class DatabaseService {
  private isUnlocked: boolean = false;
  private currentPassword?: string;

  getUnlockedStatus(): boolean {
    return this.isUnlocked;
  }

  getCurrentPassword(): string | undefined {
    return this.currentPassword;
  }

  async checkDatabaseExists(): Promise<boolean> {
    if (isTauri()) {
      try {
        return await invoke<boolean>('check_db_exists');
      } catch (err) {
        console.error('Erro ao verificar DB no Tauri:', err);
        return false;
      }
    } else {
      // No navegador, se tivermos a senha definida em localStorage, o DB existe.
      return (localStorage.getItem('acaua_master_password') || localStorage.getItem('psi_crm_master_password')) !== null;
    }
  }

  async deleteDatabase(): Promise<void> {
    this.isUnlocked = false;
    this.currentPassword = undefined;
    if (isTauri()) {
      try {
        await invoke('delete_db');
      } catch (err) {
        console.error('Erro ao deletar DB no Tauri:', err);
      }
    } else {
      const keys = ['master_password', 'config', 'patients', 'evolutions', 'attachments', 'clinical_tools', 'appointments', 'finance', 'daily_tasks', 'notes', 'theme'];
      keys.forEach(k => {
        localStorage.removeItem(`acaua_${k}`);
        localStorage.removeItem(`psi_crm_${k}`);
      });
    }
  }

  async init(password: string, isNewDatabase: boolean = false): Promise<boolean> {
    if (isTauri()) {
      try {
        if (isNewDatabase) {
          await this.deleteDatabase();
        }
        await invoke('init_db', { password });
        this.isUnlocked = true;
        this.currentPassword = password;
        
        // Execute frontend migration to create notes table!
        await this.execute(`
          CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            updated_at TEXT
          )
        `);
        
        return true;
      } catch (err) {
        console.error('Erro ao abrir banco com SQLCipher:', err);
        return false;
      }
    } else {
      // Fallback Web
      const existingPassword = localStorage.getItem('acaua_master_password') || localStorage.getItem('psi_crm_master_password');
      if (isNewDatabase || !existingPassword) {
        // Primeiro acesso ou criação de novo banco: define a nova senha
        localStorage.setItem('acaua_master_password', password);
        this.isUnlocked = true;
        this.currentPassword = password;
        // Cria tabelas mock padrão
        mockDb.set('config', { name: '', crp: '', contact: '', autoLockTime: 5, theme: 'dark' });
        mockDb.set('patients', []);
        mockDb.set('evolutions', []);
        mockDb.set('attachments', []);
        mockDb.set('clinical_tools', []);
        mockDb.set('appointments', []);
        mockDb.set('finance', []);
        mockDb.set('daily_tasks', []);
        mockDb.set('notes', [
          { id: 1, title: 'Ideias Clínicas', content: 'Ideias de técnicas de TCC para testar com pacientes...\n- Questionamento socrático\n- Diário de pensamentos automáticos', updated_at: new Date().toISOString() },
          { id: 2, title: 'Lembretes Gerais', content: 'Lembrar de preencher as fichas da CFP até o fim do mês.', updated_at: new Date().toISOString() }
        ]);
        return true;
      } else {
        if (existingPassword === password) {
          this.isUnlocked = true;
          this.currentPassword = password;
          return true;
        }
        return false;
      }
    }
  }

  async close(): Promise<void> {
    this.isUnlocked = false;
    this.currentPassword = undefined;
    if (isTauri()) {
      try {
        await invoke('close_db');
      } catch (err) {
        console.error('Erro ao fechar DB no Tauri:', err);
      }
    }
  }

  // --- MÉTODOS DE CONSULTA (Executa comandos SQL em Tauri ou simula no navegador) ---

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (isTauri()) {
      try {
        return await invoke<T[]>('db_query', { sql, params });
      } catch (err) {
        console.error('Erro SQL query:', err, { sql, params });
        throw err;
      }
    } else {
      return this.simulateQuery<T>(sql, params);
    }
  }

  async execute(sql: string, params: any[] = []): Promise<number> {
    if (isTauri()) {
      try {
        return await invoke<number>('db_execute', { sql, params });
      } catch (err) {
        console.error('Erro SQL execute:', err, { sql, params });
        throw err;
      }
    } else {
      return this.simulateExecute(sql, params);
    }
  }

  async backup(destPath: string): Promise<void> {
    if (isTauri()) {
      await invoke('backup_db', { destPath });
    } else {
      console.log(`[Backup Web] Cópia simulada salva para: ${destPath}`);
      // Simula download do JSON contendo os dados
      const allData = {
        config: mockDb.get('config', {}),
        patients: mockDb.get('patients', []),
        evolutions: mockDb.get('evolutions', []),
        attachments: mockDb.get('attachments', []),
        clinical_tools: mockDb.get('clinical_tools', []),
        appointments: mockDb.get('appointments', []),
        finance: mockDb.get('finance', [])
      };
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_clinica_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // --- SIMULADOR SQL LIGHT (Para rodar no navegador) ---
  private simulateQuery<T>(sql: string, params: any[]): T[] {
    const cleaned = sql.replace(/\s+/g, ' ').trim().toUpperCase();

    if (cleaned.startsWith('SELECT * FROM CONFIG')) {
      const config = mockDb.get('config', { name: '', crp: '', contact: '', autoLockTime: 5, theme: 'dark' }) as any;
      const dbConfig = {
        name: config.name,
        crp: config.crp,
        contact: config.contact,
        auto_lock_time: config.auto_lock_time !== undefined ? config.auto_lock_time : (config.autoLockTime !== undefined ? config.autoLockTime : 5),
        autoLockTime: config.auto_lock_time !== undefined ? config.auto_lock_time : (config.autoLockTime !== undefined ? config.autoLockTime : 5),
        theme: config.theme
      };
      return [dbConfig] as unknown as T[];
    }

    if (cleaned.startsWith('SELECT') && cleaned.includes('FROM PATIENTS')) {
      const patients = mockDb.get('patients', []) as Patient[];
      // Se houver filtro WHERE id = ? ou similar
      if (cleaned.includes('WHERE ID = ?')) {
        const id = params[0];
        return patients.filter(p => p.id === id) as unknown as T[];
      }
      return patients.sort((a, b) => b.id - a.id) as unknown as T[];
    }

    if (cleaned.startsWith('SELECT * FROM EVOLUTIONS')) {
      const evolutions = mockDb.get('evolutions', []) as Evolution[];
      if (cleaned.includes('WHERE PATIENT_ID = ?')) {
        const pId = params[0];
        return evolutions
          .filter(e => e.patient_id === pId)
          .sort((a, b) => {
            const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return b.id - a.id;
          }) as unknown as T[];
      }
      return evolutions as unknown as T[];
    }

    if (cleaned.startsWith('SELECT * FROM ATTACHMENTS') || cleaned.includes('FROM ATTACHMENTS')) {
      const attachments = mockDb.get('attachments', []) as Attachment[];
      if (cleaned.includes('WHERE ID = ?')) {
        const id = params[0];
        return attachments.filter(a => a.id === id) as unknown as T[];
      }
      if (cleaned.includes('WHERE PATIENT_ID = ?')) {
        const pId = params[0];
        return attachments.filter(a => a.patient_id === pId) as unknown as T[];
      }
      return attachments as unknown as T[];
    }

    if (cleaned.startsWith('SELECT * FROM CLINICAL_TOOLS')) {
      const tools = mockDb.get('clinical_tools', []) as ClinicalTool[];
      if (cleaned.includes('WHERE PATIENT_ID = ?')) {
        const pId = params[0];
        return tools.filter(t => t.patient_id === pId) as unknown as T[];
      }
      return tools as unknown as T[];
    }

    if (cleaned.startsWith('SELECT * FROM APPOINTMENTS')) {
      const appointments = mockDb.get('appointments', []) as Appointment[];
      if (cleaned.includes('WHERE PATIENT_ID = ?')) {
        const pId = params[0];
        return appointments
          .filter(a => a.patient_id === pId)
          .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)) as unknown as T[];
      }
      if (cleaned.includes('WHERE DATE = ?')) {
        const date = params[0];
        return appointments.filter(a => a.date === date) as unknown as T[];
      }
      return appointments.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)) as unknown as T[];
    }

    if (cleaned.startsWith('SELECT') && cleaned.includes('FROM FINANCE')) {
      let finance = mockDb.get('finance', []) as Transaction[];
      
      // Filtro por patient_id + date + status + category (usado pelo DailyTracker para desfazer)
      if (cleaned.includes('WHERE PATIENT_ID = ?') && cleaned.includes('AND DATE = ?') && cleaned.includes('AND STATUS = ?') && cleaned.includes('AND CATEGORY = ?')) {
        const pId = params[0];
        const date = params[1];
        const status = params[2];
        const category = params[3];
        finance = finance.filter(t => t.patient_id === pId && t.date === date && t.status === status && t.category === category);
        return finance as unknown as T[];
      }

      // Filtro de data LIKE (ex: '2026-07%')
      if (cleaned.includes('WHERE DATE LIKE ?')) {
        const pattern = params[0].replace(/%/g, '');
        finance = finance.filter(t => t.date.startsWith(pattern));
      }
      
      // Filtro de tipo (INCOME/EXPENSE)
      if (cleaned.includes('AND TYPE = ?') || cleaned.includes('WHERE TYPE = ?')) {
        const type = cleaned.includes('WHERE DATE LIKE ?') ? params[1] : params[0];
        finance = finance.filter(t => t.type === type);
      }
      
      return finance.sort((a, b) => b.date.localeCompare(a.date)) as unknown as T[];
    }

    if (cleaned.startsWith('SELECT * FROM DAILY_TASKS')) {
      const dailyTasks = mockDb.get('daily_tasks', []) as DailyTask[];
      if (cleaned.includes('WHERE DATE = ?')) {
        const date = params[0];
        return dailyTasks.filter(t => t.date === date) as unknown as T[];
      }
      return dailyTasks as unknown as T[];
    }

    if (cleaned.startsWith('SELECT * FROM NOTES') || cleaned.includes('FROM NOTES')) {
      let notes = mockDb.get('notes', []) as any[];
      if (cleaned.includes('WHERE ID = ?')) {
        const id = params[0];
        return notes.filter(n => n.id === id) as unknown as T[];
      }
      return notes.sort((a, b) => b.updated_at.localeCompare(a.updated_at)) as unknown as T[];
    }

    return [] as T[];
  }

  private simulateExecute(sql: string, params: any[]): number {
    const cleaned = sql.replace(/\s+/g, ' ').trim().toUpperCase();

    if (cleaned.startsWith('INSERT INTO CONFIG') || cleaned.startsWith('UPDATE CONFIG')) {
      // Simula salvar config
      const config = {
        name: params[0],
        crp: params[1],
        contact: params[2],
        autoLockTime: params[3],
        auto_lock_time: params[3],
        theme: params[4] || 'dark'
      };
      mockDb.set('config', config);
      return 1;
    }

    if (cleaned.startsWith('INSERT INTO PATIENTS')) {
      const patients = mockDb.get('patients', []) as Patient[];
      const newId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1;
      const newPatient: Patient = {
        id: newId,
        name: params[0],
        cpf: params[1],
        birth_date: params[2],
        phone: params[3],
        address: params[4],
        emergency_contact: params[5],
        created_at: new Date().toISOString(),
        status: 'FILA_ESPERA',
        billing_model: params[6] || 'AVULSO',
        sessions_remaining: params[7] || 0,
        package_price: params[8] || 0,
        session_price: params[9] || 150,
        psychiatrist_contact: params[10] || '',
        medical_conditions: params[11] || ''
      };
      patients.push(newPatient);
      mockDb.set('patients', patients);
      return newId;
    }

    if (cleaned.startsWith('UPDATE PATIENTS SET STATUS = ?, KANBAN_ORDER = ?')) {
      const patients = mockDb.get('patients', []) as Patient[];
      const status = params[0];
      const order = params[1];
      const id = params[2];
      const idx= patients.findIndex(p => p.id === id);
      if (idx!== -1) {
        patients[idx].status = status;
        patients[idx].kanban_order = order;
        mockDb.set('patients', patients);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('UPDATE PATIENTS SET KANBAN_ORDER = ?')) {
      const patients = mockDb.get('patients', []) as Patient[];
      const order = params[0];
      const id = params[1];
      const idx= patients.findIndex(p => p.id === id);
      if (idx!== -1) {
        patients[idx].kanban_order = order;
        mockDb.set('patients', patients);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('UPDATE PATIENTS SET STATUS = ?')) {
      const patients = mockDb.get('patients', []) as Patient[];
      const status = params[0];
      const id = params[1];
      const idx= patients.findIndex(p => p.id === id);
      if (idx!== -1) {
        patients[idx].status = status;
        mockDb.set('patients', patients);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('UPDATE PATIENTS SET SESSIONS_REMAINING = ?')) {
      const patients = mockDb.get('patients', []) as Patient[];
      const sessions = params[0];
      const id = params[1];
      const idx= patients.findIndex(p => p.id === id);
      if (idx!== -1) {
        patients[idx].sessions_remaining = sessions;
        mockDb.set('patients', patients);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('UPDATE PATIENTS SET NAME = ?')) {
      const patients = mockDb.get('patients', []) as Patient[];
      const id = params[13];
      const idx= patients.findIndex(p => p.id === id);
      if (idx!== -1) {
        patients[idx] = {
          ...patients[idx],
          name: params[0],
          cpf: params[1],
          birth_date: params[2],
          phone: params[3],
          address: params[4],
          emergency_contact: params[5],
          billing_model: params[6],
          sessions_remaining: params[7],
          package_price: params[8],
          session_price: params[9],
          psychiatrist_contact: params[10],
          medical_conditions: params[11],
          status: params[12]
        };
        mockDb.set('patients', patients);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('DELETE FROM PATIENTS')) {
      const id = params[0];
      // Hard Delete paciente e todas as referências dele
      let patients = mockDb.get('patients', []) as Patient[];
      patients = patients.filter(p => p.id !== id);
      mockDb.set('patients', patients);

      let evolutions = mockDb.get('evolutions', []) as Evolution[];
      evolutions = evolutions.filter(e => e.patient_id !== id);
      mockDb.set('evolutions', evolutions);

      let attachments = mockDb.get('attachments', []) as Attachment[];
      attachments = attachments.filter(a => a.patient_id !== id);
      mockDb.set('attachments', attachments);

      let tools = mockDb.get('clinical_tools', []) as ClinicalTool[];
      tools = tools.filter(t => t.patient_id !== id);
      mockDb.set('clinical_tools', tools);

      let appointments = mockDb.get('appointments', []) as Appointment[];
      appointments = appointments.filter(a => a.patient_id !== id);
      mockDb.set('appointments', appointments);

      let finance = mockDb.get('finance', []) as Transaction[];
      finance = finance.filter(f => f.patient_id !== id);
      mockDb.set('finance', finance);

      return 1;
    }

    if (cleaned.startsWith('INSERT INTO EVOLUTIONS')) {
      const evolutions = mockDb.get('evolutions', []) as Evolution[];
      const newId = evolutions.length > 0 ? Math.max(...evolutions.map(e => e.id)) + 1 : 1;
      const newEvolution: Evolution = {
        id: newId,
        patient_id: params[0],
        date: params[1],
        title: params[2],
        content: params[3],
        created_at: new Date().toISOString()
      };
      evolutions.push(newEvolution);
      mockDb.set('evolutions', evolutions);
      return newId;
    }

    if (cleaned.startsWith('DELETE FROM EVOLUTIONS')) {
      const id = params[0];
      let evolutions = mockDb.get('evolutions', []) as Evolution[];
      evolutions = evolutions.filter(e => e.id !== id);
      mockDb.set('evolutions', evolutions);
      return 1;
    }

    if (cleaned.startsWith('UPDATE EVOLUTIONS')) {
      const content = params[0];
      const title = params[1];
      const id = params[2];
      const evolutions = mockDb.get('evolutions', []) as Evolution[];
      const idx= evolutions.findIndex(e => e.id === id);
      if (idx!== -1) {
        evolutions[idx].content = content;
        evolutions[idx].title = title;
        mockDb.set('evolutions', evolutions);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('UPDATE ATTACHMENTS')) {
      const name = params[0];
      const id = params[1];
      const attachments = mockDb.get('attachments', []) as Attachment[];
      const idx= attachments.findIndex(a => a.id === id);
      if (idx!== -1) {
        attachments[idx].name = name;
        mockDb.set('attachments', attachments);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('INSERT INTO ATTACHMENTS')) {
      const attachments = mockDb.get('attachments', []) as Attachment[];
      const newId = attachments.length > 0 ? Math.max(...attachments.map(a => a.id)) + 1 : 1;
      const newAttachment: Attachment = {
        id: newId,
        patient_id: params[0],
        name: params[1],
        mime_type: params[2],
        data: params[3],
        created_at: new Date().toISOString()
      };
      attachments.push(newAttachment);
      mockDb.set('attachments', attachments);
      return newId;
    }

    if (cleaned.startsWith('DELETE FROM ATTACHMENTS')) {
      const id = params[0];
      let attachments = mockDb.get('attachments', []) as Attachment[];
      attachments = attachments.filter(a => a.id !== id);
      mockDb.set('attachments', attachments);
      return 1;
    }

    if (cleaned.startsWith('DELETE FROM CLINICAL_TOOLS')) {
      const id = params[0];
      let tools = mockDb.get('clinical_tools', []) as ClinicalTool[];
      tools = tools.filter(t => t.id !== id);
      mockDb.set('clinical_tools', tools);
      return 1;
    }

    if (cleaned.startsWith('INSERT INTO CLINICAL_TOOLS')) {
      const tools = mockDb.get('clinical_tools', []) as ClinicalTool[];
      const newId = tools.length > 0 ? Math.max(...tools.map(t => t.id)) + 1 : 1;
      const newTool: ClinicalTool = {
        id: newId,
        patient_id: params[0],
        type: params[1],
        data: params[2],
        created_at: new Date().toISOString()
      };
      tools.push(newTool);
      mockDb.set('clinical_tools', tools);
      return newId;
    }

    if (cleaned.startsWith('UPDATE CLINICAL_TOOLS')) {
      const tools = mockDb.get('clinical_tools', []) as ClinicalTool[];
      const id = params[1];
      const idx= tools.findIndex(t => t.id === id);
      if (idx!== -1) {
        tools[idx] = {
          ...tools[idx],
          data: params[0]
        };
        mockDb.set('clinical_tools', tools);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('INSERT INTO APPOINTMENTS')) {
      const appointments = mockDb.get('appointments', []) as Appointment[];
      const newId = appointments.length > 0 ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
      const newAppt: Appointment = {
        id: newId,
        patient_id: params[0],
        patient_name: params[1],
        date: params[2],
        time: params[3],
        duration: params[4],
        status: params[5],
        notes: params[6],
        custom_price: params[7] !== undefined ? params[7] : null
      };
      appointments.push(newAppt);
      mockDb.set('appointments', appointments);
      return newId;
    }

    if (cleaned.startsWith('UPDATE APPOINTMENTS')) {
      const appointments = mockDb.get('appointments', []) as Appointment[];
      // UPDATE appointments SET date = ?, time = ?, duration = ?, status = ?, notes = ? WHERE id = ?
      // OU UPDATE appointments SET status = ? WHERE id = ?
      if (cleaned.includes('SET STATUS = ?') && !cleaned.includes('TIME = ?')) {
        const status = params[0];
        const id = params[1];
        const idx= appointments.findIndex(a => a.id === id);
        if (idx!== -1) {
          appointments[idx].status = status;
          mockDb.set('appointments', appointments);
          return 1;
        }
      } else {
        const id = params[5];
        const idx= appointments.findIndex(a => a.id === id);
        if (idx!== -1) {
          appointments[idx] = {
            ...appointments[idx],
            date: params[0],
            time: params[1],
            duration: params[2],
            status: params[3],
            notes: params[4]
          };
          mockDb.set('appointments', appointments);
          return 1;
        }
      }
      return 0;
    }

    if (cleaned.startsWith('DELETE FROM APPOINTMENTS')) {
      let appointments = mockDb.get('appointments', []) as Appointment[];
      if (cleaned.includes('WHERE PATIENT_ID = ?') && cleaned.includes('DATE >= ?')) {
        const pId = params[0];
        const dateLimit = params[1];
        appointments = appointments.filter(a => !(a.patient_id === pId && a.date >= dateLimit));
        mockDb.set('appointments', appointments);
        return 1;
      }
      if (cleaned.includes('WHERE PATIENT_NAME = ?') && cleaned.includes('DATE >= ?')) {
        const pName = params[0];
        const dateLimit = params[1];
        appointments = appointments.filter(a => !(a.patient_name === pName && a.date >= dateLimit));
        mockDb.set('appointments', appointments);
        return 1;
      }
      const id = params[0];
      appointments = appointments.filter(a => a.id !== id);
      mockDb.set('appointments', appointments);
      return 1;
    }

    if (cleaned.startsWith('INSERT INTO FINANCE')) {
      const finance = mockDb.get('finance', []) as Transaction[];
      const newId = finance.length > 0 ? Math.max(...finance.map(f => f.id)) + 1 : 1;
      const newTrans: Transaction = {
        id: newId,
        patient_id: params[0],
        type: params[1],
        category: params[2],
        description: params[3],
        amount: params[4],
        date: params[5],
        status: params[6] || 'CONFIRMED'
      };
      finance.push(newTrans);
      mockDb.set('finance', finance);
      return newId;
    }

    if (cleaned.startsWith('UPDATE FINANCE SET STATUS = ?')) {
      const finance = mockDb.get('finance', []) as Transaction[];
      const status = params[0];
      const id = params[1];
      const idx= finance.findIndex(f => f.id === id);
      if (idx!== -1) {
        finance[idx].status = status;
        mockDb.set('finance', finance);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('DELETE FROM FINANCE')) {
      const id = params[0];
      let finance = mockDb.get('finance', []) as Transaction[];
      finance = finance.filter(f => f.id !== id);
      mockDb.set('finance', finance);
      return 1;
    }

    if (cleaned.startsWith('INSERT INTO DAILY_TASKS')) {
      const dailyTasks = mockDb.get('daily_tasks', []) as DailyTask[];
      const newId = dailyTasks.length > 0 ? Math.max(...dailyTasks.map(t => t.id)) + 1 : 1;
      const newT: DailyTask = {
        id: newId,
        title: params[0],
        time: params[1],
        done: params[2] || 0,
        date: params[3],
        important: params[4] || 0
      };
      dailyTasks.push(newT);
      mockDb.set('daily_tasks', dailyTasks);
      return newId;
    }

    if (cleaned.startsWith('UPDATE DAILY_TASKS SET DONE = ?')) {
      const dailyTasks = mockDb.get('daily_tasks', []) as DailyTask[];
      const done = params[0];
      const id = params[1];
      const idx= dailyTasks.findIndex(t => t.id === id);
      if (idx!== -1) {
        dailyTasks[idx].done = done;
        mockDb.set('daily_tasks', dailyTasks);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('DELETE FROM DAILY_TASKS')) {
      const id = params[0];
      let dailyTasks = mockDb.get('daily_tasks', []) as DailyTask[];
      dailyTasks = dailyTasks.filter(t => t.id !== id);
      mockDb.set('daily_tasks', dailyTasks);
      return 1;
    }

    if (cleaned.startsWith('CREATE TABLE IF NOT EXISTS NOTES')) {
      return 1;
    }

    if (cleaned.startsWith('INSERT INTO NOTES')) {
      const notes = mockDb.get('notes', []) as any[];
      const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
      const newNote = {
        id: newId,
        title: params[0],
        content: params[1],
        updated_at: params[2] || new Date().toISOString()
      };
      notes.push(newNote);
      mockDb.set('notes', notes);
      return newId;
    }

    if (cleaned.startsWith('UPDATE NOTES')) {
      const notes = mockDb.get('notes', []) as any[];
      const title = params[0];
      const content = params[1];
      const updatedAt = params[2];
      const id = params[3];
      const idx= notes.findIndex(n => n.id === id);
      if (idx!== -1) {
        notes[idx] = { ...notes[idx], title, content, updated_at: updatedAt };
        mockDb.set('notes', notes);
        return 1;
      }
      return 0;
    }

    if (cleaned.startsWith('DELETE FROM NOTES')) {
      const id = params[0];
      let notes = mockDb.get('notes', []) as any[];
      notes = notes.filter(n => n.id !== id);
      mockDb.set('notes', notes);
      return 1;
    }

    return 0;
  }
}

export const dbService = new DatabaseService();
