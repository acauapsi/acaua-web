// Gerador e Seeder de Dados Demonstrativos Realistas para a Versão Web
import type { Patient, Evolution, Appointment, Transaction, DailyTask, ClinicalTool } from './db';

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

const addDays = (base: Date, days: number): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

export const seedDemoDataIfEmpty = () => {
  if (typeof window === 'undefined') return;

  // Versão 5 do seeder para garantir atualização automática no navegador
  const alreadySeeded = localStorage.getItem('acaua_demo_seeded_v5');
  if (alreadySeeded) return;

  // Limpa chaves legadas e reseta para nova base enriquecida
  const oldKeys = [
    'psi_crm_master_password', 'psi_crm_config', 'psi_crm_patients', 
    'psi_crm_appointments', 'psi_crm_finance', 'psi_crm_evolutions', 
    'psi_crm_daily_tasks', 'psi_crm_notes', 'psi_crm_theme', 'psi_crm_tour_done',
    'acaua_demo_seeded_v1', 'acaua_demo_seeded_v2', 'acaua_demo_seeded_v3', 'acaua_demo_seeded_v4'
  ];
  oldKeys.forEach(k => localStorage.removeItem(k));

  const today = new Date();
  const todayStr = toDateStr(today);
  const curMonth = String(today.getMonth() + 1).padStart(2, '0');

  // Aniversário para hoje (ano fictício 1996)
  const bdayTodayStr = `1996-${curMonth}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Senha Mestra pré-configurada
  localStorage.setItem('acaua_master_password', 'acaua2026');
  localStorage.setItem('acaua_tour_done', '1');

  // 2. Perfil do Psicólogo
  const config = {
    name: 'Dr. Luiz Gustavo Santos',
    crp: '06/142857',
    contact: '(11) 98765-4321',
    autoLockTime: 15,
    auto_lock_time: 15,
    theme: 'dark'
  };
  localStorage.setItem('acaua_config', JSON.stringify(config));
  localStorage.setItem('acaua_theme', 'dark');

  // 3. Pacientes (12 perfis clínicos completos com todos os status do Kanban e particularidades clínicas)
  const patients: Patient[] = [
    {
      id: 1,
      name: 'Mariana Souza Alencar',
      cpf: '341.892.408-12',
      birth_date: '1994-03-15',
      phone: '(11) 97123-4567',
      address: 'Rua das Palmeiras, 142 - Apto 32, São Paulo - SP',
      emergency_contact: 'Cláudia (Mãe) - (11) 97111-2233',
      created_at: addDays(today, -90),
      status: 'EM_TERAPIA',
      billing_model: 'PACOTE',
      sessions_remaining: 7,
      package_price: 1800,
      session_price: 180,
      psychiatrist_contact: 'Dra. Helena Vasconcelos (11) 3214-5500',
      medical_conditions: 'Transtorno de Ansiedade Generalizada (TAG), insônia inicial leve',
      kanban_order: 1
    },
    {
      id: 2,
      name: 'Carlos Eduardo Ferreira',
      cpf: '452.198.374-55',
      birth_date: '1988-11-22',
      phone: '(11) 98234-5678',
      address: 'Av. Paulista, 1842 - Bela Vista, São Paulo - SP',
      emergency_contact: 'Renata (Esposa) - (11) 98222-3344',
      created_at: addDays(today, -14),
      status: 'AVALIACAO_INICIAL',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 190,
      psychiatrist_contact: '',
      medical_conditions: 'Sintomas somáticos de estresse ocupacional e sobrecarga laboral',
      kanban_order: 1
    },
    {
      id: 3,
      name: 'Beatriz Lima Mendes',
      cpf: '215.748.903-41',
      birth_date: '1992-07-08',
      phone: '(11) 99345-6789',
      address: 'Rua Harmonia, 530 - Vila Madalena, São Paulo - SP',
      emergency_contact: 'Paula (Irmã) - (11) 99333-4455',
      created_at: addDays(today, -60),
      status: 'EM_TERAPIA',
      billing_model: 'PACOTE',
      sessions_remaining: 2, // Alerta de renovação de pacote!
      package_price: 1500,
      session_price: 150,
      psychiatrist_contact: 'Dr. Roberto Meireles (11) 3045-8899',
      medical_conditions: 'Episódio Depressivo Moderado (em remissão progressiva)',
      kanban_order: 2
    },
    {
      id: 4,
      name: 'Gabriel Alves Ribeiro',
      cpf: '189.472.361-90',
      birth_date: '2001-09-19',
      phone: '(11) 96456-7890',
      address: 'Rua Augusta, 920, São Paulo - SP',
      emergency_contact: 'Marcos (Pai) - (11) 96444-5566',
      created_at: addDays(today, -5),
      status: 'FILA_ESPERA',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 160,
      psychiatrist_contact: '',
      medical_conditions: 'Dificuldades de habilidades sociais e fobia de apresentações acadêmicas',
      kanban_order: 1
    },
    {
      id: 5,
      name: 'Juliana Cristina Ramos',
      cpf: '302.819.740-03',
      birth_date: '1985-04-30',
      phone: '(11) 97567-8901',
      address: 'Rua Vergueiro, 2200 - Liberdade, São Paulo - SP',
      emergency_contact: 'Tatiane (Irmã) - (11) 97555-6677',
      created_at: addDays(today, -180),
      status: 'PREPARACAO_ALTA',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 180,
      psychiatrist_contact: '',
      medical_conditions: 'Transição de carreira e consolidação de autonomia; sintomas ansiosos em remissão',
      kanban_order: 1
    },
    {
      id: 6,
      name: 'Lucas Gabriel Costa',
      cpf: '298.631.504-88',
      birth_date: bdayTodayStr, // Aniversariante de HOJE para disparar alerta no menu Acauã
      phone: '(11) 98678-9012',
      address: 'Rua Teodoro Sampaio, 1100 - Pinheiros, São Paulo - SP',
      emergency_contact: 'Camila (Namorada) - (11) 98666-7788',
      created_at: addDays(today, -45),
      status: 'EM_TERAPIA',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 170,
      psychiatrist_contact: '',
      medical_conditions: 'Regulação emocional e autoconhecimento',
      kanban_order: 3
    },
    {
      id: 7,
      name: 'Renata Silveira Dias',
      cpf: '388.912.445-71',
      birth_date: '1990-12-04',
      phone: '(11) 97321-9988',
      address: 'Rua Oscar Freire, 810 - Cerqueira César, São Paulo - SP',
      emergency_contact: 'Vinícius (Marido) - (11) 97333-8877',
      created_at: addDays(today, -80),
      status: 'EM_TERAPIA',
      billing_model: 'PACOTE',
      sessions_remaining: 1, // Alerta: resta apenas 1 sessão no pacote!
      package_price: 1900,
      session_price: 190,
      psychiatrist_contact: 'Dra. Carolina Pimentel (11) 3812-7000',
      medical_conditions: 'Perfeccionismo clínico, sobrecarga e ansiedade de desempenho',
      kanban_order: 4
    },
    {
      id: 8,
      name: 'Thiago Henrique Martins',
      cpf: '419.203.881-22',
      birth_date: '1987-08-14',
      phone: '(11) 98456-1122',
      address: 'Rua Pamplona, 1200 - Jardim Paulista, São Paulo - SP',
      emergency_contact: 'Mariana (Esposa) - (11) 98444-2233',
      created_at: addDays(today, -210),
      status: 'ALTA', // Paciente com Alta Clínica concluída com sucesso!
      billing_model: 'PACOTE',
      sessions_remaining: 0,
      package_price: 1800,
      session_price: 180,
      psychiatrist_contact: '',
      medical_conditions: 'Tratamento concluído: superação de luto complicado e reestruturação pessoal',
      kanban_order: 1
    },
    {
      id: 9,
      name: 'Camila Rocha Albuquerque',
      cpf: '277.654.321-19',
      birth_date: '1998-02-17',
      phone: '(11) 96123-4455',
      address: 'Rua Domingos de Morais, 1450 - Vila Mariana, São Paulo - SP',
      emergency_contact: 'Laura (Mãe) - (11) 96111-3344',
      created_at: addDays(today, -3),
      status: 'FILA_ESPERA',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 170,
      psychiatrist_contact: '',
      medical_conditions: 'Busca acolhimento para término de relacionamento e reorganização de rotina',
      kanban_order: 2
    },
    {
      id: 10,
      name: 'Felipe Guimarães Novaes',
      cpf: '512.348.910-63',
      birth_date: '2008-06-25', // Adolescente (17 anos)
      phone: '(11) 97890-1234',
      address: 'Rua Tuiuti, 1900 - Tatuapé, São Paulo - SP',
      emergency_contact: 'Silvia (Mãe e Responsável Legal) - (11) 97888-5678',
      created_at: addDays(today, -10),
      status: 'AVALIACAO_INICIAL',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 180,
      psychiatrist_contact: '',
      medical_conditions: 'Dificuldades de regulação emocional e queixas escolares; acompanhamento familiar',
      kanban_order: 2
    },
    {
      id: 11,
      name: 'Patrícia Helena Prado',
      cpf: '334.789.012-44',
      birth_date: '1991-10-18',
      phone: '(11) 99112-8899',
      address: 'Rua Mourato Coelho, 980 - Pinheiros, São Paulo - SP',
      emergency_contact: 'André (Esposo) - (11) 99100-7788',
      created_at: addDays(today, -40),
      status: 'EM_TERAPIA',
      billing_model: 'AVULSO',
      sessions_remaining: 0,
      package_price: 0,
      session_price: 190,
      psychiatrist_contact: '',
      medical_conditions: 'Puerpério e adaptação à maternidade; regulação de humor e rede de apoio',
      kanban_order: 5
    },
    {
      id: 12,
      name: 'Rodrigo Santoro de Oliveira',
      cpf: '401.993.812-70',
      birth_date: '1984-05-12',
      phone: '(11) 98555-4321',
      address: 'Rua Bela Cintra, 1600 - Consolação, São Paulo - SP',
      emergency_contact: 'Carla (Irmã) - (11) 98544-3210',
      created_at: addDays(today, -30),
      status: 'EM_TERAPIA',
      billing_model: 'PACOTE',
      sessions_remaining: 9,
      package_price: 2000,
      session_price: 200,
      psychiatrist_contact: 'Dr. Fernando Lins (11) 3144-9000',
      medical_conditions: 'Síndrome de Burnout em engenharia de software e manejo de limites saudáveis',
      kanban_order: 6
    }
  ];
  localStorage.setItem('acaua_patients', JSON.stringify(patients));

  // 4. Evoluções Clínicas (SOAP detalhado e fundamentado para vários pacientes)
  const evolutions: Evolution[] = [
    {
      id: 1,
      patient_id: 1,
      date: addDays(today, -7),
      title: 'Sessão 12 — Manejo de Pensamentos Automáticos e Exposição',
      content: `S (Subjetivo):
Paciente relata melhora na latência do sono (cerca de 30min para adormecer, contra 2h anteriormente). Refere episódio pontual de taquicardia pré-reunião com diretoria na quinta-feira, mas conseguiu aplicar a técnica de respiração diafragmática com sucesso.

O (Objetivo):
Apresentou-se pontual, vestimenta adequada, contato visual mantido. Afeto congruente, humor eutímico. Trouxe o RPD preenchido conforme combinado na sessão 11.

A (Avaliação):
Boa adesão às intervenções cognitivo-comportamentais. Redução perceptível do comportamento de esquiva experiencial. Crença intermediária ("preciso ser infalível para ser respeitada") identificada para reestruturação.

P (Plano):
1. Manter diário de pensamentos automáticos com foco na distorção 'Tudo ou Nada'.
2. Experimento comportamental: delegar uma tarefa operacional sem revisar previamente.
3. Próxima sessão agendada para daqui a 7 dias.`,
      created_at: addDays(today, -7) + 'T10:00:00Z'
    },
    {
      id: 2,
      patient_id: 1,
      date: addDays(today, -14),
      title: 'Sessão 11 — Psicoeducação sobre Ciclo da Ansiedade',
      content: `S (Subjetivo):
Paciente queixa-se de aperto no peito e preocupações excessivas com o prazo de entrega de projeto de fim de trimestre.

O (Objetivo):
Tensão motora perceptível nos ombros, fala acelerada no início do atendimento, relaxando após intervenção.

A (Avaliação):
Ansiedade anticipatória ativada por gatilhos corporativos. Hipervigilância corporal amplificando sensações físicas inofensivas.

P (Plano):
Trabalhada psicoeducação sobre o papel evolutivo da ansiedade. Treinada técnica de respiração em 4 tempos. Tarefa: registrar gatilhos ao longo da semana.`,
      created_at: addDays(today, -14) + 'T10:00:00Z'
    },
    {
      id: 3,
      patient_id: 2,
      date: addDays(today, -3),
      title: 'Sessão 02 — Anamnese e Mapeamento de Estressores Ocupacionais',
      content: `S (Subjetivo):
Carlos relata cansaço extremo e dificuldade para desconectar do trabalho aos finais de semana. Cita conflito com sócio.

O (Objetivo):
Discurso focado em obrigações, postura corporal tensa, queixa frequente de cefaleia tensional no final da tarde.

A (Avaliação):
Quadro compatível com estresse crônico laboral. Fronteiras fragilizadas entre vida pessoal e demandas remotas.

P (Plano):
Estabelecer pacto inicial de encerramento das notificações de celular às 19h30. Próxima sessão: mapeamento de valores pessoais versus rotina de obrigações.`,
      created_at: addDays(today, -3) + 'T14:30:00Z'
    },
    {
      id: 4,
      patient_id: 3,
      date: addDays(today, -5),
      title: 'Sessão 08 — Avaliação de Humor e Ativação Comportamental',
      content: `S (Subjetivo):
Beatriz pontuou melhora na disposição matinal após ajuste do Escitalopram com a psiquiatra. Retomou caminhadas matinais 3x na semana.

O (Objetivo):
Postura mais expansiva, sorriso espontâneo, afeto modulado. Relatou sentir-se mais disposta para convívio social.

A (Avaliação):
Evolução clínica positiva. Resposta terapêutica consistente à combinação de farmacoterapia e ativação comportamental da TCC.

P (Plano):
Agendamento de atividade prazerosa no fim de semana com amigas. Conversar na próxima sessão sobre a renovação do pacote terapêutico.`,
      created_at: addDays(today, -5) + 'T16:00:00Z'
    },
    {
      id: 5,
      patient_id: 5,
      date: addDays(today, -10),
      title: 'Sessão 22 — Preparação para Alta e Consolidação de Autonomia',
      content: `S (Subjetivo):
Juliana expressa sentimento de segurança diante dos novos desafios profissionais. Relata que conseguiu lidar com feedback negativo sem espiral de autocrítica.

O (Objetivo):
Comunicação assertiva, afeto estável, repertório maduro de resolução de problemas.

A (Avaliação):
Critérios de alta terapêutica atingidos em 90%. Paciente adquiriu sólida metacognição e autocompaixão diante de frustrações.

P (Plano):
Espaçar atendimentos para quinzenais. Elaborar o Manual Pessoal de Prevenção de Recaídas.`,
      created_at: addDays(today, -10) + 'T11:00:00Z'
    },
    {
      id: 6,
      patient_id: 8,
      date: addDays(today, -20),
      title: 'Sessão 24 — Relatório de Alta Clínica e Encerramento',
      content: `S (Subjetivo):
Thiago realizou retrospectiva de todo o percurso terapêutico. Expressa gratidão pelo processo e prontidão para seguir seu caminho.

O (Objetivo):
Expressão serena, discurso coerente e integrado sobre suas perdas e conquistas. Nenhuma queixa clínica remanescente.

A (Avaliação):
Processo de luto elaborado de maneira saudável e satisfatória. Recursos psíquicos fortalecidos, independência emocional consolidada.

P (Plano):
Concessão de alta clínica consentida. Canal aberto para sessões pontuais de acompanhamento ("check-in") após 6 meses caso sinta necessidade.`,
      created_at: addDays(today, -20) + 'T15:00:00Z'
    },
    {
      id: 7,
      patient_id: 10,
      date: addDays(today, -2),
      title: 'Sessão 01 — Anamnese Inicial e Enquadre com Responsáveis',
      content: `S (Subjetivo):
Felipe compareceu acompanhado da mãe, Silvia. Relata desmotivação com o terceiro ano do ensino médio e pressão por vestibular.

O (Objetivo):
Inicialmente retraído e lacônico, mostrou-se mais colaborativo quando conversamos individualmente sobre interesses pessoais (games e design).

A (Avaliação):
Angústia própria do ciclo vital e transição para vida adulta. Estabelecimento positivo de rapport inicial.

P (Plano):
Definir contrato terapêutico e confidencialidade. Próxima sessão individual com Felipe para construção de mapa de interesses.`,
      created_at: addDays(today, -2) + 'T16:30:00Z'
    }
  ];
  localStorage.setItem('acaua_evolutions', JSON.stringify(evolutions));

  // 5. Agendamentos na Agenda Google Calendar (Passado, Hoje, Semana e Mês)
  const appointments: Appointment[] = [
    // Consultas de ONTEM (Histórico recente)
    {
      id: 98,
      patient_id: 1,
      patient_name: 'Mariana Souza Alencar',
      date: addDays(today, -1),
      time: '09:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão 12 - Aplicação de RPD'
    },
    {
      id: 99,
      patient_id: 10,
      patient_name: 'Felipe Guimarães Novaes',
      date: addDays(today, -1),
      time: '14:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão Inicial com responsáveis'
    },

    // Consultas de HOJE
    {
      id: 101,
      patient_id: 1,
      patient_name: 'Mariana Souza Alencar',
      date: todayStr,
      time: '08:30',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Trazer experimento comportamental'
    },
    {
      id: 102,
      patient_id: 2,
      patient_name: 'Carlos Eduardo Ferreira',
      date: todayStr,
      time: '10:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão 03 - Mapeamento de estressores',
      custom_price: 190
    },
    {
      id: 103,
      patient_id: 6,
      patient_name: 'Lucas Gabriel Costa',
      date: todayStr,
      time: '11:30',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Aniversariante do dia! Felicitar no início da sessão'
    },
    {
      id: 104,
      patient_id: 3,
      patient_name: 'Beatriz Lima Mendes',
      date: todayStr,
      time: '14:00',
      duration: 50,
      status: 'PENDING',
      notes: 'Alinhar renovação de pacote terapêutico'
    },
    {
      id: 105,
      patient_id: 7,
      patient_name: 'Renata Silveira Dias',
      date: todayStr,
      time: '15:30',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Última sessão do pacote vigente'
    },
    {
      id: 106,
      patient_id: 11,
      patient_name: 'Patrícia Helena Prado',
      date: todayStr,
      time: '17:00',
      duration: 50,
      status: 'PENDING',
      notes: 'Avaliação de rede de apoio e rotina materna'
    },
    {
      id: 107,
      patient_id: 12,
      patient_name: 'Rodrigo Santoro de Oliveira',
      date: todayStr,
      time: '18:30',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Definição de rituais de desconexão pós-expediente'
    },

    // Consultas de AMANHÃ
    {
      id: 108,
      patient_id: 5,
      patient_name: 'Juliana Cristina Ramos',
      date: addDays(today, 1),
      time: '10:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão quinzenal de pré-alta'
    },
    {
      id: 109,
      patient_id: 10,
      patient_name: 'Felipe Guimarães Novaes',
      date: addDays(today, 1),
      time: '14:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Atendimento individual com Felipe'
    },
    {
      id: 110,
      patient_id: 4,
      patient_name: 'Gabriel Alves Ribeiro',
      date: addDays(today, 1),
      time: '16:00',
      duration: 50,
      status: 'PENDING',
      notes: 'Primeira sessão pós-fila de espera'
    },

    // Consultas nos próximos dias da semana e mês
    {
      id: 111,
      patient_id: 1,
      patient_name: 'Mariana Souza Alencar',
      date: addDays(today, 3),
      time: '09:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão de seguimento'
    },
    {
      id: 112,
      patient_id: 3,
      patient_name: 'Beatriz Lima Mendes',
      date: addDays(today, 4),
      time: '15:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Início do novo ciclo'
    },
    {
      id: 113,
      patient_id: 2,
      patient_name: 'Carlos Eduardo Ferreira',
      date: addDays(today, 5),
      time: '11:00',
      duration: 50,
      status: 'PENDING',
      notes: 'Revisão de metas de autocuidado'
    },
    {
      id: 114,
      patient_id: 7,
      patient_name: 'Renata Silveira Dias',
      date: addDays(today, 7),
      time: '14:30',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão semanal'
    },
    {
      id: 115,
      patient_id: 12,
      patient_name: 'Rodrigo Santoro de Oliveira',
      date: addDays(today, 8),
      time: '18:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Manejo de ansiedade corporativa'
    },
    {
      id: 116,
      patient_id: 6,
      patient_name: 'Lucas Gabriel Costa',
      date: addDays(today, 10),
      time: '10:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Acompanhamento regular'
    },
    {
      id: 117,
      patient_id: 11,
      patient_name: 'Patrícia Helena Prado',
      date: addDays(today, 12),
      time: '16:00',
      duration: 50,
      status: 'CONFIRMED',
      notes: 'Sessão quinzenal'
    }
  ];
  localStorage.setItem('acaua_appointments', JSON.stringify(appointments));

  // 6. Dados Financeiros Realistas (6 meses com sazonalidade e histórico completo)
  const finance: Transaction[] = [];
  let txId = 1;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${y}-${m}`;

    // Receitas regulares do mês
    finance.push({
      id: txId++,
      patient_id: 1,
      type: 'INCOME',
      category: 'Sessão Clínica',
      description: 'Pacote TCC 10 Sessões - Mariana Souza',
      amount: 1800,
      date: `${monthPrefix}-05`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: 2,
      type: 'INCOME',
      category: 'Sessão Clínica',
      description: 'Atendimentos Avulsos - Carlos Eduardo',
      amount: 760,
      date: `${monthPrefix}-10`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: 3,
      type: 'INCOME',
      category: 'Sessão Clínica',
      description: 'Pacote Psicoterapia - Beatriz Lima',
      amount: 1500,
      date: `${monthPrefix}-14`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: 7,
      type: 'INCOME',
      category: 'Sessão Clínica',
      description: 'Pacote Clínico - Renata Silveira',
      amount: 1900,
      date: `${monthPrefix}-18`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: 12,
      type: 'INCOME',
      category: 'Sessão Clínica',
      description: 'Pacote Saúde Mental - Rodrigo Santoro',
      amount: 2000,
      date: `${monthPrefix}-22`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: null,
      type: 'INCOME',
      category: 'Supervisão Clínica',
      description: 'Supervisão de Casos Clínicos (2 psicólogos)',
      amount: 600,
      date: `${monthPrefix}-25`,
      status: 'CONFIRMED'
    });

    // Despesas fixas e operacionais do mês
    finance.push({
      id: txId++,
      patient_id: null,
      type: 'EXPENSE',
      category: 'Aluguel Consultório',
      description: 'Locação de Sala Clínica e Condomínio',
      amount: 1250,
      date: `${monthPrefix}-05`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: null,
      type: 'EXPENSE',
      category: 'Supervisão Recebida',
      description: 'Supervisão com Psicólogo Sênior em TCC',
      amount: 400,
      date: `${monthPrefix}-12`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: null,
      type: 'EXPENSE',
      category: 'Software e Ferramentas',
      description: 'Assinatura Software de Gestão e Internet',
      amount: 195,
      date: `${monthPrefix}-15`,
      status: 'CONFIRMED'
    });

    finance.push({
      id: txId++,
      patient_id: null,
      type: 'EXPENSE',
      category: 'Anuidade Profissional',
      description: 'Parcela Anuidade CRP 06/SP',
      amount: 130,
      date: `${monthPrefix}-20`,
      status: 'CONFIRMED'
    });

    // Despesa variável em meses selecionados (livros e cursos)
    if (i % 2 === 0) {
      finance.push({
        id: txId++,
        patient_id: null,
        type: 'EXPENSE',
        category: 'Educação Continuada',
        description: 'Livros técnicos e manuais de intervenção clínica',
        amount: 320,
        date: `${monthPrefix}-26`,
        status: 'CONFIRMED'
      });
    }
  }
  localStorage.setItem('acaua_finance', JSON.stringify(finance));

  // 7. Tarefas Diárias (Daily Tracker com tarefas de hoje, atrasadas e da semana)
  const dailyTasks: DailyTask[] = [
    // Tarefa atrasada de ontem para exibir o indicador vermelho "Atrasado"
    {
      id: 1,
      title: 'Emitir recibo da consulta de Carlos Eduardo',
      time: '18:00',
      done: 0,
      date: addDays(today, -1),
      important: 1
    },

    // Tarefas de HOJE
    {
      id: 2,
      title: 'Enviar mensagem de felicitações para Lucas Gabriel (Lucas)',
      time: '09:00',
      done: 0,
      date: todayStr,
      important: 1
    },
    {
      id: 3,
      title: 'Enviar lembrete de renovação de pacote para Beatriz',
      time: '13:30',
      done: 0,
      date: todayStr,
      important: 1
    },
    {
      id: 4,
      title: 'Preparar contrato e proposta de renovação para Renata',
      time: '15:00',
      done: 0,
      date: todayStr,
      important: 1
    },
    {
      id: 5,
      title: 'Revisar notas para supervisão clínica com Dra. Amanda [Bloco de Notas]',
      time: '17:30',
      done: 1, // Concluída hoje
      date: todayStr,
      important: 0
    },
    {
      id: 6,
      title: 'Conciliar pagamentos da semana e fluxo de caixa [Financeiro]',
      time: '19:15',
      done: 0,
      date: todayStr,
      important: 0
    },

    // Tarefas dos próximos dias da semana
    {
      id: 7,
      title: 'Preencher declaração de comparecimento para Mariana [Documentos]',
      time: '10:00',
      done: 0,
      date: addDays(today, 1),
      important: 0
    },
    {
      id: 8,
      title: 'Estudo do capítulo sobre ACT para paciente Gabriel',
      time: '14:00',
      done: 0,
      date: addDays(today, 2),
      important: 1
    },
    {
      id: 9,
      title: 'Redigir síntese do processo terapêutico de Juliana [Documentos]',
      time: '11:00',
      done: 0,
      date: addDays(today, 3),
      important: 0
    },
    {
      id: 10,
      title: 'Entrar em contato com Camila para agendamento de triagem',
      time: '16:00',
      done: 0,
      date: addDays(today, 4),
      important: 0
    }
  ];
  localStorage.setItem('acaua_daily_tasks', JSON.stringify(dailyTasks));

  // 8. Bloco de Notas (Notas e protocolos clínicos de alta qualidade)
  const notes = [
    {
      id: 1,
      title: 'Protocolo de Desfusão Cognitiva (ACT)',
      content: `Lembretes para aplicação em sessão com foco em ruminação:
1. Exercício das "Folhas no Riacho" para pensamentos intrusivos e obsessivos.
2. Nomeação da mente ("Minha mente está me contando a história de que...").
3. Questionamento pragmático: "Esse pensamento está te aproximando ou te afastando de quem você quer ser?".
4. Uso com a paciente Mariana Souza quando houver autoexigência laboral excessiva.`,
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Roteiro de Alta e Prevenção de Recaídas',
      content: `Etapas do processo de alta para pacientes em fase final:
- Revisão da linha do tempo com as conquistas desde a sessão 01.
- Identificação dos gatilhos superados e estratégias de enfrentamento desenvolvidas.
- Construção conjunta do "Kit de Emergência Emocional" (o que fazer se os sintomas voltarem).
- Definição do espaçamento de sessões (quinzenal -> mensal -> alta formal).`,
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      title: 'Checklist de Anamnese Inicial e Enquadre (CFP 06/2019)',
      content: `Pontos indispensáveis no primeiro contato clínico:
1. Apresentação do contrato terapêutico e política de faltas/desmarcações.
2. Esclarecimento sobre sigilo profissional e suas exceções legais e éticas.
3. Coleta de dados de emergência e contato psiquiátrico (se houver).
4. Alinhamento de expectativas do paciente e primeiros objetivos terapêuticos.`,
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      title: 'Supervisão Clínica — Temas e Dúvidas',
      content: `Tópicos para discussão na próxima reunião com o grupo de supervisão:
- Caso Carlos Eduardo: manejo da resistência à desaceleração profissional em executivos.
- Caso Beatriz: momento ideal para redução da medicação em conjunto com psiquiatra.
- Referências bibliográficas recomendadas sobre regulação emocional no pós-parto.`,
      updated_at: new Date().toISOString()
    }
  ];
  localStorage.setItem('acaua_notes', JSON.stringify(notes));

  // 9. Ferramentas Clínicas (Genograma SVG interativo, Mapeamento Farmacológico e RPD)
  const genogramData = {
    members: [
      { id: '1', name: 'Mariana (Paciente)', age: 32, gender: 'F', relationship: 'Paciente', condition: 'Ansiedade (TAG)' },
      { id: '2', name: 'Cláudia (Mãe)', age: 58, gender: 'F', relationship: 'Mãe', condition: 'Hipertensão / Traços Ansiosos' },
      { id: '3', name: 'Roberto (Pai)', age: 62, gender: 'M', relationship: 'Pai', condition: 'Histórico de Alcoolismo' },
      { id: '4', name: 'Lucas (Irmão)', age: 28, gender: 'M', relationship: 'Irmão', condition: 'Saudável' }
    ],
    connections: [
      { from: '2', to: '1', type: 'CLOSE' },
      { from: '3', to: '1', type: 'CONFLICT' },
      { from: '2', to: '3', type: 'DIVORCED' }
    ]
  };

  const pharmaData = [
    {
      id: 'med-1',
      name: 'Escitalopram',
      dosage: '15mg pela manhã',
      startDate: addDays(today, -120),
      status: 'ACTIVE',
      notes: 'Prescrito por Dra. Helena. Boa tolerabilidade, redução de ataques de pânico.'
    },
    {
      id: 'med-2',
      name: 'Clonazepam',
      dosage: '0.25mg gotas SOS',
      startDate: addDays(today, -120),
      status: 'ACTIVE',
      notes: 'Uso esporádico reservado para crises agudas de ansiedade.'
    },
    {
      id: 'med-3',
      name: 'Zolpidem',
      dosage: '5mg se necessário',
      startDate: addDays(today, -90),
      endDate: addDays(today, -30),
      status: 'SUSPENDED',
      notes: 'Suspenso após consolidação da higiene do sono e desfusão cognitiva.'
    }
  ];

  const rpdData = {
    records: [
      {
        id: 'rpd-1',
        date: addDays(today, -6),
        situation: 'Reunião de alinhamento com a diretoria da empresa',
        automaticThoughts: 'Vou travar na minha fala e todos vão perceber que sou incompetente.',
        cognitiveDistortions: ['Catastrofização', 'Leitura Mental'],
        emotions: [{ name: 'Ansiedade', intensity: 85 }, { name: 'Medo', intensity: 75 }],
        adaptiveResponse: 'Já conduzi reuniões com esse mesmo público antes e recebi elogios. Sentir ansiedade é natural antes de expor resultados importantes, não significa incapacidade.',
        outcome: [{ name: 'Ansiedade', intensity: 30 }, { name: 'Autoconfiança', intensity: 70 }]
      }
    ]
  };

  const clinicalTools: ClinicalTool[] = [
    {
      id: 1,
      patient_id: 1,
      type: 'GENOGRAM' as any,
      data: JSON.stringify(genogramData),
      created_at: addDays(today, -45)
    },
    {
      id: 2,
      patient_id: 3,
      type: 'PHARMA' as any,
      data: JSON.stringify(pharmaData),
      created_at: addDays(today, -60)
    },
    {
      id: 3,
      patient_id: 1,
      type: 'RPD' as any,
      data: JSON.stringify(rpdData),
      created_at: addDays(today, -6)
    }
  ];
  localStorage.setItem('acaua_clinical_tools', JSON.stringify(clinicalTools));

  // Marca como populado com a versão 5
  localStorage.setItem('acaua_demo_seeded_v5', 'true');
};
