import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { dbService } from '../services/db';
import type { Patient, Evolution, Attachment, Appointment } from '../services/db';
import { ConfirmModal } from './ConfirmModal';
import { jsPDF } from 'jspdf';
import { 
  Users, UserPlus, Search, User, Edit, FileText, Calendar, Plus, Trash2, Download, Paperclip, 
  ChevronRight, ArrowLeft, Save, AlertTriangle, Activity, HelpCircle, Phone, X, Minus, Eye, CheckCircle2, XCircle, Clock
} from 'lucide-react';

interface PatientsProps {
  selectedPatientId?: number | null;
  onClearPatientSelection: () => void;
  professionalName: string;
  professionalCrp: string;
  professionalContact: string;
}

export const Patients: React.FC<PatientsProps> = ({ 
  selectedPatientId, 
  onClearPatientSelection,
  professionalName,
  professionalCrp,
  professionalContact
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Modals / Forms States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  
  // Patient Form Fields
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [billingModel, setBillingModel] = useState<'AVULSO' | 'PACOTE'>('AVULSO');
  const [sessionsRemaining, setSessionsRemaining] = useState<number>(0);
  const [packagePrice, setPackagePrice] = useState<number>(0);
  const [sessionPrice, setSessionPrice] = useState<number | ''>('');
  const [psychiatristContact, setPsychiatristContact] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [status, setStatus] = useState<string>('FILA_ESPERA');

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Prontuário Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'evolutions' | 'sessions' | 'genogram' | 'pharma' | 'attachments' | 'settings'>('info');

  // Appointments (Sessions) state
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);

  // Evolutions states
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [newEvoTitle, setNewEvoTitle] = useState('');
  const [newEvoDate, setNewEvoDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEvoContent, setNewEvoContent] = useState('');
  const [showAddEvoModal, setShowAddEvoModal] = useState(false);
  const [evoType, setEvoType] = useState<'TEXT' | 'SOAP'>('TEXT');
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');
  const [selectedEvolution, setSelectedEvolution] = useState<Evolution | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAttachmentId, setEditingAttachmentId] = useState<number | null>(null);
  const [editingAttachmentName, setEditingAttachmentName] = useState('');

  // Genograma & Ecomapa states
  const [genogramNodes, setGenogramNodes] = useState<any[]>([]);
  const [genogramEdges, setGenogramEdges] = useState<any[]>([]);
  const [genogramRecordId, setGenogramRecordId] = useState<number | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Genograma Edge Form states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionType, setConnectionType] = useState<'NORMAL' | 'CLOSE' | 'CONFLIT' | 'BROKEN' | 'DISTANT'>('NORMAL');
  const [sidebarConnectTargetId, setSidebarConnectTargetId] = useState('');

  // Mapeamento Farmacológico states
  const [medications, setMedications] = useState<any[]>([]);
  const [pharmaRecordId, setPharmaRecordId] = useState<number | null>(null);
  
  // Pharma Form states
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [medEndDate, setMedEndDate] = useState('');
  const [medStatus, setMedStatus] = useState<'ACTIVE' | 'CHANGED' | 'SUSPENDED'>('ACTIVE');
  const [medNotes, setMedNotes] = useState('');



  // Hard Delete State
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Custom Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      handleViewPatient(selectedPatientId);
    }
  }, [selectedPatientId]);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      type
    });
  };

  const loadPatients = async () => {
    try {
      const data = await dbService.query<Patient>('SELECT * FROM patients');
      setPatients(data);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPatient || isEditingInfo) {
        // Edit Mode
        const patientId = editingPatient ? editingPatient.id : selectedPatient?.id;
        await dbService.execute(
          'UPDATE patients SET name = ?, cpf = ?, birth_date = ?, phone = ?, address = ?, emergency_contact = ?, billing_model = ?, sessions_remaining = ?, package_price = ?, session_price = ?, psychiatrist_contact = ?, medical_conditions = ?, status = ? WHERE id = ?',
          [name, cpf, birthDate, phone, address, emergencyContact, billingModel, sessionsRemaining, packagePrice, sessionPrice === '' ? null : sessionPrice, psychiatristContact, medicalConditions, status, patientId]
        );
        setSelectedPatient({
          ...selectedPatient!,
          name, cpf, birth_date: birthDate, phone, address, emergency_contact: emergencyContact,
          billing_model: billingModel,
          sessions_remaining: sessionsRemaining,
          package_price: packagePrice,
          session_price: sessionPrice === '' ? null : sessionPrice,
          psychiatrist_contact: psychiatristContact,
          medical_conditions: medicalConditions,
          status: status
        });
        setEditingPatient(null);
        setIsEditingInfo(false);
      } else {
        // Create Mode - only ask for initial fields, defaults for the rest
        await dbService.execute(
          'INSERT INTO patients (name, cpf, birth_date, phone, address, emergency_contact, billing_model, sessions_remaining, package_price, session_price, psychiatrist_contact, medical_conditions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, cpf, birthDate, phone, address, '', 'AVULSO', 0, 0, null, '', '', status]
        );
        setShowAddForm(false);
      }
      
      // Reset fields
      setName(''); setCpf(''); setBirthDate(''); setPhone(''); setAddress(''); setEmergencyContact('');
      setBillingModel('AVULSO'); setSessionsRemaining(0); setPackagePrice(0); setSessionPrice('');
      setPsychiatristContact(''); setMedicalConditions(''); setStatus('FILA_ESPERA');
      loadPatients();
    } catch (err) {
      console.error('Erro ao gravar paciente:', err);
    }
  };

  const handleEditClick = (p: Patient) => {
    setName(p.name);
    setCpf(p.cpf || '');
    setBirthDate(p.birth_date || '');
    setPhone(p.phone || '');
    setAddress(p.address || '');
    setEmergencyContact(p.emergency_contact || '');
    setBillingModel(p.billing_model || 'AVULSO');
    setSessionsRemaining(p.sessions_remaining || 0);
    setPackagePrice(p.package_price || 0);
    setSessionPrice(p.session_price !== null && p.session_price !== undefined ? p.session_price : '');
    setPsychiatristContact(p.psychiatrist_contact || '');
    setMedicalConditions(p.medical_conditions || '');
    setStatus(p.status || 'FILA_ESPERA');
    setActiveTab('info');
    setIsEditingInfo(true);
  };

  const handleViewPatient = async (id: number) => {
    try {
      const res = await dbService.query<Patient>('SELECT * FROM patients WHERE id = ?', [id]);
      if (res.length > 0) {
        const p = res[0];
        setSelectedPatient(p);
        setName(p.name);
        setCpf(p.cpf || '');
        setBirthDate(p.birth_date || '');
        setPhone(p.phone || '');
        setAddress(p.address || '');
        setEmergencyContact(p.emergency_contact || '');
        setBillingModel(p.billing_model || 'AVULSO');
        setSessionsRemaining(p.sessions_remaining || 0);
        setPackagePrice(p.package_price || 0);
        setSessionPrice(p.session_price !== null && p.session_price !== undefined ? p.session_price : '');
        setPsychiatristContact(p.psychiatrist_contact || '');
        setMedicalConditions(p.medical_conditions || '');
        setStatus(p.status || 'FILA_ESPERA');
        
        setIsEditingInfo(false);
        setActiveTab('info');
        loadPatientData(id);
      }
    } catch (err) {
      console.error('Erro ao carregar prontuário do paciente:', err);
    }
  };

  const loadPatientData = async (patientId: number) => {
    try {
      // 1. Evoluções
      const evos = await dbService.query<Evolution>(
        'SELECT * FROM evolutions WHERE patient_id = ? ORDER BY date DESC, id DESC',
        [patientId]
      );
      setEvolutions(evos);

      // Auto-progress clinical journey based on active evolution count
      const patientRes = await dbService.query<Patient>('SELECT status FROM patients WHERE id = ?', [patientId]);
      if (patientRes.length > 0) {
        const currentStatus = patientRes[0].status;
        const activeEvosCount = evos.filter(e => e.content !== '[Registro Excluído]').length;
        let newStatus = currentStatus;

        if (activeEvosCount === 1) {
          if (currentStatus === 'FILA_ESPERA') {
            newStatus = 'AVALIACAO_INICIAL';
          }
        } else if (activeEvosCount >= 2) {
          if (currentStatus === 'FILA_ESPERA' || currentStatus === 'AVALIACAO_INICIAL') {
            newStatus = 'EM_TERAPIA';
          }
        }

        if (newStatus !== currentStatus) {
          await dbService.execute('UPDATE patients SET status = ? WHERE id = ?', [newStatus, patientId]);
          setSelectedPatient(prev => prev && prev.id === patientId ? { ...prev, status: newStatus } : prev);
          setStatus(newStatus);
          loadPatients();
        }
      }

      // 1.5. Consultas / Sessõees
      const appts = await dbService.query<Appointment>(
        'SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC, time DESC',
        [patientId]
      );
      setPatientAppointments(appts);

      // 2. Anexos
      const atts = await dbService.query<Attachment>(
        'SELECT id, patient_id, name, mime_type, created_at FROM attachments WHERE patient_id = ? ORDER BY id DESC',
        [patientId]
      );
      setAttachments(atts);

      // 3. Genograma
      const genoRes = await dbService.query<any>(
        'SELECT * FROM clinical_tools WHERE patient_id = ? AND type = ? LIMIT 1',
        [patientId, 'GENOGRAM']
      );
      if (genoRes.length > 0) {
        setGenogramRecordId(genoRes[0].id);
        const parsed = JSON.parse(genoRes[0].data);
        setGenogramNodes(parsed.nodes || []);
        setGenogramEdges(parsed.edges || []);
      } else {
        setGenogramRecordId(null);
        setGenogramNodes([]);
        setGenogramEdges([]);
      }

      // 4. Mapeamento Farmacológico
      const pharmaRes = await dbService.query<any>(
        'SELECT * FROM clinical_tools WHERE patient_id = ? AND type = ? LIMIT 1',
        [patientId, 'PHARMA']
      );
      if (pharmaRes.length > 0) {
        setPharmaRecordId(pharmaRes[0].id);
        try {
          const parsed = JSON.parse(pharmaRes[0].data);
          if (Array.isArray(parsed)) {
            setMedications(parsed);
          } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).medications)) {
            setMedications((parsed as any).medications);
          } else {
            setMedications([]);
          }
        } catch (e) {
          console.error("Erro ao fazer parse dos dados farmacológicos:", e);
          setMedications([]);
        }
      } else {
        setPharmaRecordId(null);
        setMedications([]);
      }
    } catch (err) {
      console.error('Erro ao carregar registros do prontuário:', err);
    }
  };

  // --- EVOLUTIONS BUSINESS LOGIC ---
  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    let finalContent = '';
    if (evoType === 'TEXT') {
      if (!newEvoContent.trim()) return;
      finalContent = newEvoContent.trim();
    } else {
      if (!soapSubjective.trim() || !soapObjective.trim() || !soapAssessment.trim() || !soapPlan.trim()) {
        triggerConfirm(
          'Campos Incompletos',
          'Para o padrãoo SOAP, preencha todos os 4 campos (Subjetivo, Objetivo, Avaliação e Plano) para fins de registro clínico completo.',
          () => {},
          'warning'
        );
        return;
      }
      finalContent = `S (Subjetivo):\n${soapSubjective.trim()}\n\nO (Objetivo):\n${soapObjective.trim()}\n\nA (Avaliação):\n${soapAssessment.trim()}\n\nP (Plano):\n${soapPlan.trim()}`;
    }

    try {
      const title = newEvoTitle.trim() || `Sessão do dia ${new Date(newEvoDate).toLocaleDateString('pt-BR')}`;
      await dbService.execute(
        'INSERT INTO evolutions (patient_id, date, title, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [selectedPatient.id, newEvoDate, title, finalContent, new Date().toISOString()]
      );

      // Automatically complete any outstanding daily tasks for writing this evolution
      try {
        await dbService.execute(
          "UPDATE daily_tasks SET done = 1 WHERE title LIKE ? AND done = 0",
          [`%Escrever evolução: ${selectedPatient.name}%`]
        );
      } catch (e) {
        console.error('Erro ao dar baixa em tarefa de evolução:', e);
      }

      setNewEvoTitle('');
      setNewEvoContent('');
      setSoapSubjective('');
      setSoapObjective('');
      setSoapAssessment('');
      setSoapPlan('');
      setShowAddEvoModal(false);
      loadPatientData(selectedPatient.id);
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
    }
  };

  const handleDeleteEvolution = (id: number) => {
    triggerConfirm(
      'Anular Registro Clínico',
      'Tem certeza de que deseja anular esta evolução clínica? O registro permanecerá no prontuário com o status "Registro Excluído" para fins de auditoria clínica e legal.',
      async () => {
        try {
          await dbService.execute(
            'UPDATE evolutions SET content = ?, title = ? WHERE id = ?',
            ['[Registro Excluído]', '[Registro Excluído]', id]
          );
          loadPatientData(selectedPatient!.id);
        } catch (err) {
          console.error('Erro ao anular evolução:', err);
        }
      },
      'danger'
    );
  };

  // --- ATTACHMENTS BUSINESS LOGIC ---
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    if (!file || !selectedPatient) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        await dbService.execute(
          'INSERT INTO attachments (patient_id, name, mime_type, data, created_at) VALUES (?, ?, ?, ?, ?)',
          [selectedPatient.id, file.name, file.type, base64Data, new Date().toISOString()]
        );
        loadPatientData(selectedPatient.id);
      } catch (err) {
        console.error('Erro ao gravar anexo no banco:', err);
        triggerConfirm(
          'Erro ao Salvar Arquivo',
          'Não foi possível salvar o arquivo. Se você está testando no navegador, o limite de armazenamento local (LocalStorage) pode ter sido excedido. Tente usar um arquivo menor (até 1.5MB) ou teste no aplicativo desktop.',
          () => {},
          'warning'
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, name: string, mimeType: string) => {
    try {
      const res = await dbService.query<Attachment>(
        'SELECT data FROM attachments WHERE id = ?',
        [attachmentId]
      );
      if (res.length > 0) {
        const base64 = res[0].data;
        const linkSource = `data:${mimeType};base64,${base64}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = name;
        downloadLink.click();
      }
    } catch (err) {
      console.error('Erro ao descriptografar/baixar arquivo:', err);
    }
  };

  const handleDeleteAttachment = (id: number) => {
    triggerConfirm(
      'Excluir Anexo Clínico',
      'Tem certeza de que deseja excluir permanentemente este documento do banco criptografado?',
      async () => {
        try {
          await dbService.execute('DELETE FROM attachments WHERE id = ?', [id]);
          loadPatientData(selectedPatient!.id);
        } catch (err) {
          console.error('Erro ao excluir anexo:', err);
        }
      },
      'danger'
    );
  };

  const handlePreviewAttachment = async (attachmentId: number) => {
    try {
      const res = await dbService.query<Attachment>(
        'SELECT name, mime_type, data FROM attachments WHERE id = ?',
        [attachmentId]
      );
      if (res.length > 0) {
        const { mime_type, data } = res[0];
        
        // Convert base64 to Blob
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime_type });
        const blobUrl = URL.createObjectURL(blob);
        
        // Open Blob URL in a new window/tab
        const newWindow = window.open();
        if (newWindow) {
          newWindow.location.href = blobUrl;
        } else {
          // Fallback if window.open was blocked by popup blocker
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.target = '_blank';
          downloadLink.click();
        }
      }
    } catch (err) {
      console.error('Erro ao abrir visualização do arquivo:', err);
    }
  };

  const handleRenameAttachment = async (id: number) => {
    if (!editingAttachmentName.trim()) return;
    try {
      await dbService.execute(
        'UPDATE attachments SET name = ? WHERE id = ?',
        [editingAttachmentName.trim(), id]
      );
      setEditingAttachmentId(null);
      setEditingAttachmentName('');
      if (selectedPatient) {
        loadPatientData(selectedPatient.id);
      }
    } catch (err) {
      console.error('Erro ao renomear anexo:', err);
    }
  };



  // --- GENOGRAMA & ECOMAPA BUSINESS LOGIC ---
  const handleSaveGenogram = async () => {
    if (!selectedPatient) return;
    const jsonData = JSON.stringify({
      nodes: genogramNodes,
      edges: genogramEdges
    });
    try {
      if (genogramRecordId) {
        // UPDATE existing
        await dbService.execute(
          'UPDATE clinical_tools SET data = ? WHERE id = ?',
          [jsonData, genogramRecordId]
        );
      } else {
        // INSERT new
        const newId = await dbService.execute(
          'INSERT INTO clinical_tools (patient_id, type, data, created_at) VALUES (?, ?, ?, ?)',
          [selectedPatient.id, 'GENOGRAM', jsonData, new Date().toISOString()]
        );
        setGenogramRecordId(newId);
      }
      triggerConfirm('Sucesso', 'Genograma e Ecomapa salvos com sucesso no prontuário!', () => {}, 'info');
    } catch (err) {
      console.error('Erro ao salvar genograma:', err);
    }
  };

  const handleQuickAddNode = (symbolType: 'M' | 'F' | 'ORG' | 'INST') => {
    const id = `node-${Date.now()}`;
    const label = symbolType === 'ORG' ? 'Rede / Apoio' : symbolType === 'INST' ? 'Instituiçãoo' : 'Membro';
    
    // Spawn at center with small random offset
    const x = 200 + Math.round(Math.random() * 200);
    const y = 150 + Math.round(Math.random() * 150);
    
    const newNode = { id, label, gender: symbolType, x, y };
    setGenogramNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const handleAddChild = (e: React.MouseEvent, partnerAId: string, partnerBId: string) => {
    e.stopPropagation();
    const id = `node-${Date.now()}`;
    
    const partnerA = genogramNodes.find(n => n.id === partnerAId);
    const partnerB = genogramNodes.find(n => n.id === partnerBId);
    if (!partnerA || !partnerB) return;
    
    // Position child 80px below the midpoint of the couple
    const childX = Math.round((partnerA.x + partnerB.x) / 2);
    const childY = Math.round((partnerA.y + partnerB.y) / 2 + 80);
    
    const childNode = {
      id,
      label: 'Filho(a)',
      gender: 'M', // default to Homem
      x: childX,
      y: childY
    };
    
    setGenogramNodes(prev => [...prev, childNode]);
    
    // Connect child to both parents
    setGenogramEdges(prev => [
      ...prev,
      { from: partnerAId, to: id, type: 'NORMAL' },
      { from: partnerBId, to: id, type: 'NORMAL' }
    ]);
    
    setSelectedNodeId(id);
  };


  // --- MAPEAMENTO FARMACOLÓGICO BUSINESS LOGIC ---
  const handleSaveMedications = async (updatedMeds: any[]) => {
    if (!selectedPatient) return;
    const jsonData = JSON.stringify(updatedMeds);
    try {
      if (pharmaRecordId) {
        // UPDATE
        await dbService.execute(
          'UPDATE clinical_tools SET data = ? WHERE id = ?',
          [jsonData, pharmaRecordId]
        );
      } else {
        // INSERT
        const newId = await dbService.execute(
          'INSERT INTO clinical_tools (patient_id, type, data, created_at) VALUES (?, ?, ?, ?)',
          [selectedPatient.id, 'PHARMA', jsonData, new Date().toISOString()]
        );
        setPharmaRecordId(newId);
      }
      setMedications(updatedMeds);
    } catch (err) {
      console.error('Erro ao salvar mapeamento farmacológico:', err);
    }
  };

  // --- HARD DELETE (LGPD PERMANENT EXCLUSÃON) ---
  const handleHardDeletePatient = () => {
    if (deleteConfirmationText !== 'EXCLUIR') {
      alert('Por favor, digite EXCLUIR para confirmar a eliminação definitiva.');
      return;
    }

    triggerConfirm(
      'Exclusão Permanente de Paciente (Hard Delete)',
      `ATENÇÃO CRÍTICA: Esta ação deletará o cadastro de ${selectedPatient?.name} e TODOS os registros clínicos, notas de evolução, arquivos em anexo, agendamentos e transações financeiras vinculadas. NENHUM dado poderá ser recuperado. Deseja prosseguir?`,
      async () => {
        try {
          await dbService.execute('DELETE FROM patients WHERE id = ?', [selectedPatient!.id]);
          setSelectedPatient(null);
          setDeleteConfirmationText('');
          onClearPatientSelection();
          loadPatients();
        } catch (err) {
          console.error('Erro ao fazer exclusãoo permanente (Hard Delete):', err);
        }
      },
      'danger'
    );
  };

  // --- EXPORT ENTIRE CLINICAL DOSSIER TO PDF ---
  // --- EXPORT ENTIRE CLINICAL DOSSIER TO PDF ---
  const executePDFExport = async () => {
    if (!selectedPatient) return;

    try {
      const doc = new jsPDF();
      let y = 15;

      // Header Professional (Cabeçalho da clínica)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(184, 144, 37); // Dourado escuro
      doc.text(professionalName.toUpperCase(), 15, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Psicologia Clínica | CRP: ${professionalCrp} | Contato: ${professionalContact}`, 15, y);
      y += 4;
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 12;

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.text(`PRONTUÒRIO CLÒNICO INDIVIDUAL`, 15, y);
      y += 10;

      // Patient Info Panel
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text(`DADOS DO PACIENTE:`, 15, y);
      y += 6;

      doc.setFont('Helvetica', 'normal');
      doc.text(`Nome: ${selectedPatient.name}`, 15, y);
      y += 5;
      doc.text(`CPF: ${selectedPatient.cpf || 'Não informado'}   |   Nascimento: ${selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}`, 15, y);
      y += 5;
      doc.text(`Telefone: ${selectedPatient.phone || 'Não informado'}   |   Contato de Emergência: ${selectedPatient.emergency_contact || 'Não informado'}`, 15, y);
      y += 5;
      doc.text(`Endereço: ${selectedPatient.address || 'Não informado'}`, 15, y);
      y += 8;
      doc.line(15, y, 195, y);
      y += 12;

      // Section: Evolutions
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`HISTÓRICO DE EVOLUÇÕES CLÍNICAS`, 15, y);
      y += 8;

      if (evolutions.length === 0) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(10);
        doc.text('Nenhum registro de evolução encontrado.', 15, y);
        y += 8;
      } else {
        evolutions.forEach((evo) => {
          // Check page break
          if (y > 260) {
            doc.addPage();
            y = 20;
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          doc.text(`${evo.title} - Data da Sessão: ${new Date(evo.date).toLocaleDateString('pt-BR')}`, 15, y);
          y += 5;

          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          
          const textLines = doc.splitTextToSize(evo.content, 180);
          textLines.forEach((line: string) => {
            if (y > 275) {
              doc.addPage();
              y = 20;
            }
            doc.text(line, 15, y);
            y += 5;
          });
          y += 6;
        });
      }

      doc.save(`prontuario_${selectedPatient.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar dossiê PDF:', err);
    }
  };

  const handleExportPDF = () => {
    if (!selectedPatient) return;
    
    const docSummary = `O dossiê em PDF conterá:\n` +
      `• Identificação completa do paciente (${selectedPatient.name});\n` +
      `• Contatos de apoio e informações de faturamento;\n` +
      `• Histórico completo de evoluções clínicas (${evolutions.length} registro(s) no sistema).\n\n` +
      `Deseja prosseguir com o download?`;

    triggerConfirm(
      'Exportar Prontuário Clínico?',
      docSummary,
      executePDFExport,
      'info'
    );
  };

  const handleRenewPackage = async () => {
    if (!selectedPatient) return;
    try {
      const newSessions = 4;
      const price = selectedPatient.package_price || 500;
      await dbService.execute(
        'UPDATE patients SET sessions_remaining = ? WHERE id = ?',
        [newSessions, selectedPatient.id]
      );
      await dbService.execute(
        'INSERT INTO finance (patient_id, type, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)',
        [selectedPatient.id, 'INCOME', 'Sessão Clínica', `Renovação de Pacote (4 sessõees) - ${selectedPatient.name}`, price, new Date().toISOString().slice(0, 10)]
      );

      setSelectedPatient({
        ...selectedPatient,
        sessions_remaining: newSessions
      });

      triggerConfirm(
        'Pacote Renovado!',
        `O pacote de ${selectedPatient.name} foi renovado para 4 sessõees. Faturamento de R$ ${price.toLocaleString('pt-BR')} lançado.`,
        () => {},
        'info'
      );
      loadPatients();
    } catch (err) {
      console.error('Erro ao renovar pacote:', err);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.cpf && p.cpf.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Custom Alert/Confirm Overlay */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type={confirmState.type}
      />
      {selectedPatient ? (
        <div className="w-full flex flex-col lg:flex-row gap-6 animate-fadeIn items-stretch">
          <div className="w-full lg:w-80 shrink-0 flex flex-col justify-between bg-[#f0ede6]/40 dark:bg-charcoal-900/40 border border-[#e7e4dc] dark:border-charcoal-800 rounded-3xl p-5 gap-5 lg:h-[calc(100vh-104px)] lg:sticky lg:top-0 relative">
            
            <div className="space-y-4">
              {/* Profile Card Header (Inside unified sidebar) */}
              <div className="space-y-3 relative text-left pb-4 border-b border-[#e7e4dc] dark:border-charcoal-800/60">
                <div className="w-full flex justify-between items-center">
                  <button 
                    onClick={() => {
                      setSelectedPatient(null);
                      onClearPatientSelection();
                      loadPatients();
                    }}
                    className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/35 text-stone-600 dark:text-charcoal-355 hover:text-teal-400 rounded-xl transition-all animate-none"
                    title="Voltar para a Lista"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[8px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                    Prontuário #{selectedPatient.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {/* Small Initials Avatar */}
                  <div className="w-11 h-11 bg-gradient-to-tr from-gold-650/15 to-gold-450/30 border border-teal-500/30 rounded-xl flex items-center justify-center text-teal-400 text-xs font-black shadow-md shrink-0 relative">
                    {selectedPatient.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#08080a] rounded-full animate-none" title="Ativo"></span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h2 className="text-sm font-black text-charcoal-900 dark:text-white tracking-wide truncate" title={selectedPatient.name}>
                      {selectedPatient.name}
                    </h2>
                    <p className="text-[9px] text-stone-400 dark:text-white font-bold uppercase tracking-wider truncate">
                      {selectedPatient.billing_model === 'PACOTE' 
                        ? `Pacote (${selectedPatient.sessions_remaining} rest.)` 
                        : `Avulso (R$ ${selectedPatient.session_price || 150})`}
                    </p>
                  </div>
                </div>

                {selectedPatient.billing_model === 'PACOTE' && selectedPatient.sessions_remaining === 0 && (
                  <button
                    onClick={handleRenewPackage}
                    className="w-full bg-teal-gradient text-charcoal-950 text-[8px] font-black uppercase tracking-widest py-1.5 rounded-lg hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm"
                  >
                    Renovar Pacote
                  </button>
                )}

                {/* Phone & Birth quick info inline - Clean white/gold Lucide Icons instead of Emojis! */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[9px] text-stone-550 dark:text-white font-semibold normal-case">
                  <span className="flex items-center gap-1.5 truncate">
                    <Calendar className="h-3.5 w-3.5 text-teal-500/90 shrink-0" />
                    {selectedPatient.birth_date ? new Date(selectedPatient.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não cad.'}
                  </span>
                  <span className="flex items-center gap-1.5 truncate" title={selectedPatient.phone}>
                    <Phone className="h-3.5 w-3.5 text-teal-500/90 shrink-0" />
                    {selectedPatient.phone}
                  </span>
                </div>
              </div>

              {/* Navigation list */}
              <div className="flex flex-col gap-1 text-left">
                {[
                  { id: 'info', label: 'Dados do Paciente' },
                  { id: 'evolutions', label: 'Histórico de Evolução' },
                  { id: 'sessions', label: `Histórico de Sessõees (${patientAppointments.length})` },
                  { id: 'genogram', label: 'Genograma & Ecomapa' },
                  { id: 'pharma', label: 'Histórico Farmacológico' },
                  { id: 'attachments', label: `Arquivos (${attachments.length})` },
                  { id: 'settings', label: 'Ficha & Exclusão LGPD' },
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                        isActive
                          ? 'bg-teal-gradient text-charcoal-950 shadow-sm font-black'
                          : 'text-stone-600 dark:text-charcoal-350 hover:bg-[#f0ede6]/50 dark:hover:bg-charcoal-800/50 hover:text-teal-400'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider font-extrabold">{tab.label}</span>
                      <ChevronRight className={`h-3 w-3 transition-transform ${isActive ? 'text-charcoal-950' : 'text-stone-400 dark:text-charcoal-600 group-hover:translate-x-0.5'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick action buttons row (At the bottom of the card) */}
            <div className="pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800/60 flex gap-2">
              <button 
                onClick={() => setShowEmergencyModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 py-2.5 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider"
                title="Contato de Emergência"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Emergência
              </button>

              <button 
                onClick={handleExportPDF}
                className="flex-1 flex items-center justify-center gap-1.5 bg-teal-gradient text-charcoal-950 py-2.5 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                title="Exportar PDF Completo"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                Exportar PDF
              </button>
            </div>
          </div>

          {/* MAIN CONTENT PANE (Right) */}
          <div className="flex-1 min-w-0 space-y-6 flex flex-col lg:h-[calc(100vh-104px)]">

          {/* --- TAB CONTENT: DADOS DO PACIENTE --- */}
          {activeTab === 'info' && selectedPatient && (
            <div className="glass-panel rounded-3xl p-6 border border-[#e7e4dc] dark:border-charcoal-800 animate-fadeIn space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[#e7e4dc] dark:border-charcoal-800">
                <div>
                  <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider">Ficha Cadastral e Dados do Paciente</h3>
                  <p className="text-stone-500 dark:text-white text-xs">Informações pessoais, modelo de cobrança e histórico clínico.</p>
                </div>
                <button
                  onClick={() => {
                    if (!isEditingInfo) {
                      handleEditClick(selectedPatient);
                    } else {
                      setIsEditingInfo(false);
                    }
                  }}
                  className="flex items-center gap-2 bg-[#f0ede6] dark:bg-charcoal-900 hover:bg-charcoal-800 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-300 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <Edit className="h-3.5 w-3.5 text-teal-500" />
                  {isEditingInfo ? 'Cancelar Ediçãoo' : 'Editar Dados'}
                </button>
              </div>

              {!isEditingInfo ? (
                // Read-only View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs normal-case">
                  {/* Bloco 1: Dados Pessoais */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-[10px] text-teal-500/90 dark:text-teal-400 uppercase tracking-widest">1. Informações Pessoais</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Nome Completo</span>
                        <span className="text-sm font-bold text-charcoal-900 dark:text-white">{selectedPatient.name}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">CPF</span>
                        <span className="font-bold text-charcoal-800 dark:text-charcoal-250">{selectedPatient.cpf || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Data de Nascimento</span>
                        <span className="font-bold text-charcoal-800 dark:text-charcoal-250">{selectedPatient.birth_date ? new Date(selectedPatient.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Telefone (WhatsApp)</span>
                        <span className="font-bold text-charcoal-800 dark:text-charcoal-250">{selectedPatient.phone}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Endereço Residencial</span>
                        <span className="font-bold text-charcoal-800 dark:text-charcoal-250">{selectedPatient.address || 'Não informado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Cobrança e Financeiro */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-[10px] text-teal-500/90 dark:text-teal-400 uppercase tracking-widest">2. Financeiro & Cobrança</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block mb-1">Modelo de Cobrança</span>
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-teal-500/25 bg-gold-500/5 text-teal-500">
                          {selectedPatient.billing_model === 'PACOTE' ? 'Pacote Mensal' : 'Sessão Avulsa'}
                        </span>
                      </div>
                      {selectedPatient.billing_model === 'PACOTE' ? (
                        <>
                          <div className="pt-1">
                            <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Sessõees Restantes</span>
                            <span className="text-sm font-black text-charcoal-900 dark:text-white">{selectedPatient.sessions_remaining || 0} sessõees</span>
                          </div>
                          <div>
                            <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Valor do Pacote</span>
                            <span className="text-sm font-black text-emerald-500">R$ {selectedPatient.package_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                          </div>
                        </>
                      ) : (
                        <div className="pt-1">
                          <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Valor por Sessão</span>
                          <span className="text-sm font-black text-emerald-500">{selectedPatient.session_price !== null && selectedPatient.session_price !== undefined ? `R$ ${Number(selectedPatient.session_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Status da Jornada</span>
                        <span className="text-xs font-black uppercase tracking-wider text-charcoal-600 dark:text-charcoal-300">
                          {selectedPatient.status === 'FILA_ESPERA' && 'Fila de Espera'}
                          {selectedPatient.status === 'AVALIACAO_INICIAL' && 'Avaliação Inicial'}
                          {selectedPatient.status === 'EM_TERAPIA' && 'Em Terapia'}
                          {selectedPatient.status === 'PREPARACAO_ALTA' && 'Preparação para Alta'}
                          {selectedPatient.status === 'ALTA' && 'Alta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 3: Contatos de Apoio e Clínico */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-[10px] text-teal-500/90 dark:text-teal-400 uppercase tracking-widest">3. Contatos & Saúde</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Contato de Emergência</span>
                        <span className="font-bold text-charcoal-800 dark:text-charcoal-200">{selectedPatient.emergency_contact || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Contato do Psiquiatra</span>
                        <span className="font-bold text-charcoal-800 dark:text-charcoal-200">{selectedPatient.psychiatrist_contact || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 dark:text-white font-extrabold uppercase text-[9px] tracking-wider block">Condiçõeses Médicas / Alergias</span>
                        <span className="font-medium text-red-500 dark:text-red-400 whitespace-pre-line leading-relaxed">{selectedPatient.medical_conditions || 'Nenhuma condiçãoo grave informada.'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Editable View Form
                <form onSubmit={handleSavePatient} className="space-y-6 text-xs font-bold text-stone-600 dark:text-charcoal-300 uppercase tracking-wider">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Coluna 1: Informações Pessoais */}
                    <div className="space-y-4">
                      <h4 className="font-extrabold text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest pb-1 border-b border-[#e7e4dc] dark:border-charcoal-800">1. Informações Pessoais</h4>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-white">Nome Completo</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-white">CPF</label>
                          <input
                            type="text"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            placeholder="000.000.000-00"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-white">Data de Nascimento</label>
                          <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-white">Telefone (WhatsApp)</label>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-white">Endereço Residencial</label>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            placeholder="Rua, número, cidade"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2: Cobrança e Financeiro */}
                    <div className="space-y-4">
                      <h4 className="font-extrabold text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest pb-1 border-b border-[#e7e4dc] dark:border-charcoal-800">2. Financeiro & Cobrança</h4>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Modelo de Cobrança</label>
                          <select
                            value={billingModel}
                            onChange={(e) => setBillingModel(e.target.value as 'AVULSO' | 'PACOTE')}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans bg-white dark:bg-charcoal-900"
                          >
                            <option value="AVULSO">Sessão Avulsa</option>
                            <option value="PACOTE">Pacote Mensal</option>
                          </select>
                        </div>

                        {billingModel === 'PACOTE' ? (
                          <>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Valor do Pacote</label>
                              <input
                                type="number"
                                value={packagePrice}
                                onChange={(e) => setPackagePrice(Number(e.target.value))}
                                className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Sessõees Restantes</label>
                              <input
                                type="number"
                                value={sessionsRemaining}
                                onChange={(e) => setSessionsRemaining(Number(e.target.value))}
                                className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                            <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Valor por Sessão</label>
                            <input
                              type="number"
                              value={sessionPrice}
                              onChange={(e) => setSessionPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Jornada Clínica</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans bg-white dark:bg-charcoal-900"
                          >
                            <option value="FILA_ESPERA">Fila de Espera</option>
                            <option value="AVALIACAO_INICIAL">Avaliação Inicial</option>
                            <option value="EM_TERAPIA">Em Terapia</option>
                            <option value="PREPARACAO_ALTA">Preparação para Alta</option>
                            <option value="ALTA">Alta</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Coluna 3: Contatos e Saúde */}
                    <div className="space-y-4">
                      <h4 className="font-extrabold text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest pb-1 border-b border-[#e7e4dc] dark:border-charcoal-800">3. Contatos & Saúde</h4>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Contato de Emergência</label>
                          <input
                            type="text"
                            value={emergencyContact}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            placeholder="Nome - Telefone"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Contato do Psiquiatra</label>
                          <input
                            type="text"
                            value={psychiatristContact}
                            onChange={(e) => setPsychiatristContact(e.target.value)}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            placeholder="Nome - Telefone"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Condiçõeses Médicas / Alergias</label>
                          <textarea
                            value={medicalConditions}
                            onChange={(e) => setMedicalConditions(e.target.value)}
                            rows={3}
                            className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans resize-none"
                            placeholder="Alergias, medicamentos continuos..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(false)}
                      className="px-4 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-charcoal-900 dark:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-teal-gradient text-charcoal-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 uppercase"
                    >
                      <Save className="h-4 w-4" />
                      Salvar Alteraçõeses
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* --- TAB CONTENT: EVOLUTIONS --- */}
          {activeTab === 'evolutions' && (
            <div className="space-y-6">
              
              {/* Header com título e botãoo */}
              <div className="flex justify-between items-center pb-4 border-b border-[#e7e4dc] dark:border-charcoal-800">
                <div>
                  <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider">Histórico de Evolução Clínica</h3>
                  <p className="text-stone-500 dark:text-white text-xs">Registro cronológico de sessõees e notas terapêuticas.</p>
                </div>
                <button
                  onClick={() => {
                    setNewEvoTitle(`Sessão ${evolutions.length + 1} - `);
                    setNewEvoDate(new Date().toISOString().slice(0, 10));
                    setNewEvoContent('');
                    setSoapSubjective('');
                    setSoapObjective('');
                    setSoapAssessment('');
                    setSoapPlan('');
                    setEvoType('TEXT');
                    setShowAddEvoModal(true);
                  }}
                  className="flex items-center gap-2 bg-teal-gradient text-charcoal-950 px-4 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.99] shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Registrar Sessão
                </button>
              </div>

              {/* Lista de Evoluções (Largura total) */}
              <div className="space-y-3 pr-1">
                {evolutions.length === 0 ? (
                  <div className="glass-panel rounded-3xl p-12 text-center text-stone-500 dark:text-white flex flex-col items-center justify-center border-teal-800/40">
                    <FileText className="h-14 w-14 text-charcoal-700 mb-3 animate-pulse" />
                    <p className="font-bold text-charcoal-900 dark:text-white text-base">Prontuário Livre de Registros</p>
                    <p className="text-xs text-charcoal-500 mt-1">Clique no botãoo "Registrar Sessão" para iniciar o histórico de atendimento.</p>
                  </div>
                ) : (
                  evolutions.map((evo) => {
                    const isDeleted = evo.title === '[Registro Excluído]';
                    const timeString = evo.created_at 
                      ? new Date(evo.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                      : '--:--';
                    
                    return (
                      <div 
                        key={evo.id} 
                        onClick={() => {
                          if (!isDeleted) {
                            setSelectedEvolution(evo);
                          }
                        }}
                        className={`glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
                          isDeleted
                            ? 'opacity-40 border-red-500/10 bg-red-500/5 cursor-not-allowed select-none'
                            : 'border-[#e7e4dc] dark:border-teal-800/60/80 hover:border-teal-500/35 cursor-pointer bg-[#faf9f6]/40 dark:bg-charcoal-900/40 hover:scale-[1.005] hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Date and Time Column */}
                          <div className="flex flex-col items-start shrink-0 border-r border-[#e7e4dc] dark:border-charcoal-800/80 pr-4">
                            <span className="text-[10px] font-black text-teal-500/90 tracking-widest uppercase">
                              {new Date(evo.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[9px] font-bold text-stone-400 dark:text-white uppercase mt-0.5 tracking-wider">
                              🕒 {timeString}
                            </span>
                          </div>

                          {/* Title Column */}
                          <div className="min-w-0 text-left">
                            <h4 className={`text-sm font-bold tracking-wide truncate ${isDeleted ? 'text-red-400/80 line-through' : 'text-charcoal-900 dark:text-white'}`}>
                              {isDeleted ? 'Registro Clínico Excluído (Anulado)' : evo.title}
                            </h4>
                            <p className="text-[9px] text-stone-400 dark:text-white font-semibold uppercase mt-0.5 tracking-wider">
                              {isDeleted ? 'Este registro foi desativado por auditoria' : 'Clique para abrir o prontuário completo'}
                            </p>
                          </div>
                        </div>

                        {/* Right side delete / status icon */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {isDeleted ? (
                            <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                              Excluído
                            </span>
                          ) : (
                            <>
                              <span className="text-[8px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                {evo.content.includes('S (Subjetivo):') ? 'Padrãoo SOAP' : 'Texto Livre'}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvolution(evo.id);
                                }}
                                className="p-2 bg-[#faf9f6] dark:bg-charcoal-950 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-500 dark:text-white hover:text-red-450 hover:border-red-500/20 rounded-lg transition-all"
                                title="Anular Evolução"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* --- FULL-SCREEN REGISTRATION MODAL --- */}
              {showAddEvoModal && createPortal(
                <div className="fixed inset-0 bg-[#faf9f6] dark:bg-[#08080a] z-50 flex flex-col animate-fadeIn font-sans text-charcoal-800 dark:text-charcoal-100 overflow-hidden">
                  
                  {/* Header */}
                  <div className="h-16 border-b border-[#e7e4dc] dark:border-charcoal-800 px-6 flex items-center justify-between bg-[#faf9f6] dark:bg-[#08080a]">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest animate-none">
                        Registrar Consulta
                      </span>
                      <h2 className="text-sm font-black uppercase tracking-wider text-charcoal-900 dark:text-white">
                        Dossiê Clínico do Paciente
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowAddEvoModal(false)}
                      className="px-4 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Modal Body: FleLayout with 3 Columns */}
                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-64px)] w-full">
                    
                    <form onSubmit={handleAddEvolution} className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full h-full">
                      
                      {/* COLUMN 1 (Left): Settings & Details */}
                      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-[#e7e4dc] dark:border-charcoal-800 p-6 flex flex-col justify-between bg-[#faf9f6]/40 dark:bg-charcoal-900/10 overflow-y-auto h-full space-y-6">
                        
                        <div className="space-y-5">
                          {/* Paciente Identificador Card */}
                          <div className="bg-[#f0ede6]/40 dark:bg-charcoal-950/40 border border-teal-500/15 p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-tr from-gold-650/15 to-gold-450/30 border border-teal-500/30 rounded-xl flex items-center justify-center text-teal-400 text-xs font-black shadow-md shrink-0">
                                {selectedPatient?.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                              </div>
                              <div className="text-left min-w-0">
                                <span className="text-[7px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest block w-fit mb-0.5">
                                  Prontuário #{selectedPatient?.id}
                                </span>
                                <h3 className="text-xs font-black text-charcoal-900 dark:text-white tracking-wide truncate" title={selectedPatient?.name}>
                                  {selectedPatient?.name}
                                </h3>
                              </div>
                            </div>
                            <div className="text-left text-[9px] text-stone-500 dark:text-white font-semibold border-t border-[#e7e4dc]/50 dark:border-charcoal-800/50 pt-2 space-y-0.5">
                              <p>CPF: {selectedPatient?.cpf || 'Não informado'}</p>
                              <p>Nascimento: {selectedPatient?.birth_date ? new Date(selectedPatient.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}</p>
                            </div>
                          </div>

                          {/* Title Input */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[9px] font-bold text-stone-500 dark:text-charcoal-455 uppercase tracking-widest">
                              Título do Registro
                            </label>
                            <input
                              type="text"
                              value={newEvoTitle}
                              onChange={(e) => setNewEvoTitle(e.target.value)}
                              className="w-full glass-input rounded-xl py-2.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                              placeholder="Ex: Sessão 1"
                            />
                          </div>
                          
                          {/* Date Input */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[9px] font-bold text-stone-500 dark:text-charcoal-455 uppercase tracking-widest">
                              Data do Atendimento
                            </label>
                            <input
                              type="date"
                              value={newEvoDate}
                              onChange={(e) => setNewEvoDate(e.target.value)}
                              className="w-full glass-input rounded-xl py-2.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                              required
                            />
                          </div>

                          {/* Method Selector */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-[9px] font-bold text-stone-500 dark:text-charcoal-455 uppercase tracking-widest">
                              Método de Registro
                            </label>
                            <div className="flex flex-col gap-1.5 p-1 bg-[#f0ede6]/50 dark:bg-charcoal-900/50 border border-[#e7e4dc] dark:border-charcoal-800 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setEvoType('TEXT')}
                                className={`w-full text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  evoType === 'TEXT'
                                    ? 'bg-teal-gradient text-charcoal-950 font-black shadow-sm'
                                    : 'text-stone-600 dark:text-charcoal-350 hover:text-teal-400'
                                }`}
                              >
                                Texto Livre
                              </button>
                              <button
                                type="button"
                                onClick={() => setEvoType('SOAP')}
                                className={`w-full text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  evoType === 'SOAP'
                                    ? 'bg-teal-gradient text-charcoal-950 font-black shadow-sm'
                                    : 'text-stone-600 dark:text-charcoal-350 hover:text-teal-400'
                                }`}
                              >
                                Padrãoo SOAP
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800/60">
                          <button
                            type="button"
                            onClick={() => setShowAddEvoModal(false)}
                            className="w-full py-2.5 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-white rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="w-full py-2.5 bg-teal-gradient text-charcoal-950 font-black rounded-xl text-[10px] transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Gravar Registro
                          </button>
                        </div>

                      </div>

                      {/* COLUMN 2 (Center/Middle): Workspace / Note Editor */}
                      <div className="flex-1 p-6 overflow-y-auto flex flex-col h-full bg-[#fcfbf9]/40 dark:bg-charcoal-950/20">
                        {evoType === 'TEXT' ? (
                          <div className="flex-1 flex flex-col space-y-2 h-full text-left">
                            <label className="block text-[10px] font-bold text-stone-500 dark:text-charcoal-455 uppercase tracking-widest">
                              Anotaçõeses de Evolução (Texto Livre)
                            </label>
                            <textarea
                              value={newEvoContent}
                              onChange={(e) => setNewEvoContent(e.target.value)}
                              className="flex-1 w-full glass-input rounded-2xl p-4 text-charcoal-900 dark:text-white text-sm outline-none resize-none font-sans leading-relaxed min-h-[350px]"
                              placeholder="Descreva livremente o relato do paciente, observaçõeses clínicas, reflexõees e próximos passos da intervençãoo terapêutica..."
                              required={evoType === 'TEXT'}
                            ></textarea>
                          </div>
                        ) : (
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full text-left">
                            {/* S - Subjetivo */}
                            <div className="flex flex-col space-y-1.5">
                              <label className="block text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                                S (Subjetivo) - Relato do Paciente
                              </label>
                              <textarea
                                value={soapSubjective}
                                onChange={(e) => setSoapSubjective(e.target.value)}
                                className="flex-1 w-full glass-input rounded-xl p-3.5 text-charcoal-900 dark:text-white text-xs outline-none resize-none font-sans leading-relaxed normal-case min-h-[140px]"
                                placeholder="Queixas, sentimentos expressos, sintomas auto-relatados, eventos significativos..."
                                required={evoType === 'SOAP'}
                              ></textarea>
                            </div>

                            {/* O - Objetivo */}
                            <div className="flex flex-col space-y-1.5">
                              <label className="block text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                                O (Objetivo) - Observaçõeses Clínicas
                              </label>
                              <textarea
                                value={soapObjective}
                                onChange={(e) => setSoapObjective(e.target.value)}
                                className="flex-1 w-full glass-input rounded-xl p-3.5 text-charcoal-900 dark:text-white text-xs outline-none resize-none font-sans leading-relaxed normal-case min-h-[140px]"
                                placeholder="Postura, contato visual, humor aparente, afeto, teste de estado mental, comportamentos..."
                                required={evoType === 'SOAP'}
                              ></textarea>
                            </div>

                            {/* A - Avaliação */}
                            <div className="flex flex-col space-y-1.5">
                              <label className="block text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                                A (Avaliação) - Análise Terapêutica
                              </label>
                              <textarea
                                value={soapAssessment}
                                onChange={(e) => setSoapAssessment(e.target.value)}
                                className="flex-1 w-full glass-input rounded-xl p-3.5 text-charcoal-900 dark:text-white text-xs outline-none resize-none font-sans leading-relaxed normal-case min-h-[140px]"
                                placeholder="Hipóteses clínicas, progresso em relação aos objetivos, formulação cognitiva, insights..."
                                required={evoType === 'SOAP'}
                              ></textarea>
                            </div>

                            {/* P - Plano */}
                            <div className="flex flex-col space-y-1.5">
                              <label className="block text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                                P (Plano) - Próximos Passos
                              </label>
                              <textarea
                                value={soapPlan}
                                onChange={(e) => setSoapPlan(e.target.value)}
                                className="flex-1 w-full glass-input rounded-xl p-3.5 text-charcoal-900 dark:text-white text-xs outline-none resize-none font-sans leading-relaxed normal-case min-h-[140px]"
                                placeholder="Tarefas de casa, frentes de intervençãoo para a próxima sessão, encaminhamentos..."
                                required={evoType === 'SOAP'}
                              ></textarea>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* COLUMN 3 (Right): Reference / Last Evolution */}
                      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-[#e7e4dc] dark:border-charcoal-800 p-6 flex flex-col bg-[#faf9f6]/40 dark:bg-charcoal-900/10 overflow-y-auto h-full space-y-5 text-left">
                        <h4 className="text-[10px] font-extrabold text-[#b89025] uppercase tracking-wider pb-2 border-b border-[#e7e4dc] dark:border-charcoal-800/60 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Òšltima Sessão Registrada
                        </h4>

                        {evolutions.length > 0 ? (
                          <div className="space-y-4">
                            <div className="bg-[#f0ede6]/40 dark:bg-charcoal-950/40 border border-[#e7e4dc]/80 dark:border-charcoal-800/80 rounded-xl p-4 space-y-2.5">
                              <div className="flex justify-between items-center text-[9px] text-stone-400 dark:text-white font-bold uppercase tracking-wider">
                                <span>{new Date(evolutions[0].date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              </div>
                              <h5 className="text-xs font-black text-charcoal-900 dark:text-white truncate" title={evolutions[0].title}>
                                {evolutions[0].title}
                              </h5>
                              
                              <div className="max-h-[320px] overflow-y-auto text-[10px] text-charcoal-600 dark:text-charcoal-355 leading-relaxed font-sans font-medium whitespace-pre-wrap pr-1 normal-case">
                                {evolutions[0].content}
                              </div>
                            </div>
                            <p className="text-[9px] text-stone-400 dark:text-white font-semibold leading-relaxed italic text-center">
                              Use os detalhes do último atendimento para orientar e planejar os objetivos da consulta de hoje.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-[#f0ede6]/30 dark:bg-charcoal-950/20 border border-dashed border-[#e7e4dc] dark:border-teal-800/60 rounded-xl p-5 text-center text-stone-500 dark:text-white space-y-3">
                            <HelpCircle className="h-8 w-8 text-charcoal-700 mx-auto" />
                            <p className="text-[10px] font-bold text-charcoal-900 dark:text-white">Sem Sessõees Anteriores</p>
                            <p className="text-[9px] leading-relaxed">Este é o primeiro registro do paciente. O histórico de atendimentos será preenchido aqui para guiar suas próximas sessõees.</p>
                          </div>
                        )}
                      </div>

                    </form>

                  </div>

                </div>,
                document.body
              )}

              {/* --- READ-ONLY EVOLUTION DETAILS MODAL --- */}
              {selectedEvolution && createPortal(
                <div className="fixed inset-0 z-50 overflow-y-auto p-4 md:p-10 flex justify-center items-start animate-fadeIn font-sans text-charcoal-800 dark:text-charcoal-100">
                  <div className="max-w-3xl w-full bg-[#faf9f6] dark:bg-[#08080a] border border-teal-500/30 rounded-3xl shadow-2xl flex flex-col animate-scaleIn my-auto overflow-hidden">
                    
                    {/* Header */}
                    <div className="h-16 border-b border-[#e7e4dc] dark:border-charcoal-800 px-6 flex items-center justify-between bg-[#faf9f6] dark:bg-[#08080a]">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                          Prontuário Clínico
                        </span>
                        <h2 className="text-sm font-black uppercase tracking-wider text-charcoal-900 dark:text-white">
                          Leitura de Registro
                        </h2>
                      </div>
                      <button
                        onClick={() => setSelectedEvolution(null)}
                        className="p-1.5 rounded-lg bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-white transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="p-6 space-y-6">
                      
                      {/* Meta Info */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#f0ede6]/40 dark:bg-charcoal-900/30 border border-[#e7e4dc] dark:border-charcoal-800 p-4 rounded-2xl">
                        <div className="text-left space-y-0.5">
                          <p className="text-[8px] text-teal-400 font-black uppercase tracking-widest">Paciente</p>
                          <p className="text-sm font-extrabold text-charcoal-900 dark:text-white">{selectedPatient?.name}</p>
                        </div>
                        
                        <div className="flex gap-6 text-left">
                          <div className="space-y-0.5">
                            <p className="text-[8px] text-stone-400 dark:text-white font-black uppercase tracking-widest">Data</p>
                            <p className="text-xs font-bold text-charcoal-900 dark:text-white">
                              {new Date(selectedEvolution.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] text-stone-400 dark:text-white font-black uppercase tracking-widest">Hora</p>
                            <p className="text-xs font-bold text-charcoal-900 dark:text-white">
                              {selectedEvolution.created_at 
                                ? new Date(selectedEvolution.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                                : '--:--'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div className="space-y-4 text-left">
                        <div className="space-y-1">
                          <span className="text-[8px] text-teal-400 font-black uppercase tracking-widest">Título do Atendimento</span>
                          <h3 className="text-lg font-black text-charcoal-900 dark:text-white leading-tight font-sans tracking-wide">
                            {selectedEvolution.title}
                          </h3>
                        </div>

                        <div className="pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800/60">
                          {selectedEvolution.content.includes('S (Subjetivo):') ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedEvolution.content.split('\n\n').filter(b => b.trim()).map((block, idx) => {
                                const lines = block.split('\n');
                                const label = lines[0];
                                const val = lines.slice(1).join('\n');
                                return (
                                  <div key={idx} className="text-sm font-sans font-medium bg-[#f0ede6]/20 dark:bg-charcoal-950/20 border border-[#e7e4dc]/30 dark:border-teal-800/60/30 p-3.5 rounded-xl">
                                    <span className="font-extrabold text-[10px] text-teal-400 uppercase tracking-wider block mb-1">{label}</span>
                                    <p className="text-charcoal-700 dark:text-charcoal-200 whitespace-pre-wrap break-words break-all leading-relaxed normal-case">{val}</p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-[#f0ede6]/10 dark:bg-charcoal-950/10 border border-[#e7e4dc]/40 dark:border-teal-800/60/40 p-4 rounded-xl">
                              <span className="font-extrabold text-[8px] text-stone-400 dark:text-charcoal-550 uppercase tracking-widest block mb-2">Anotaçõeses Terapêuticas</span>
                              <p className="text-sm text-charcoal-700 dark:text-charcoal-200 whitespace-pre-wrap break-words break-all leading-relaxed font-sans font-medium normal-case">{selectedEvolution.content}</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Footer */}
                    <div className="h-16 border-t border-[#e7e4dc] dark:border-charcoal-800 px-6 flex items-center justify-end bg-[#faf9f6] dark:bg-[#08080a]">
                      <button
                        onClick={() => setSelectedEvolution(null)}
                        className="px-5 py-2.5 bg-teal-gradient text-charcoal-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
                      >
                        Fechar Leitura
                      </button>
                    </div>

                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          {/* --- TAB CONTENT: SESSIONS HISTORIC --- */}
          {activeTab === 'sessions' && (
            <div className="glass-panel rounded-3xl p-6 border border-[#e7e4dc] dark:border-charcoal-800 animate-fadeIn space-y-6 text-left">
              <div className="flex justify-between items-center pb-4 border-b border-[#e7e4dc] dark:border-charcoal-800">
                <div>
                  <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider">Histórico de Atendimentos</h3>
                  <p className="text-stone-500 dark:text-white text-xs">Visãoo geral de presenças, faltas e status das consultas agendadas.</p>
                </div>
              </div>

              {/* Mini Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Agendado', value: patientAppointments.length, color: 'text-charcoal-900 dark:text-white border-[#e7e4dc] dark:border-teal-800/60' },
                  { label: 'Presenças', value: patientAppointments.filter(a => a.status === 'CONFIRMED').length, color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' },
                  { label: 'Faltas', value: patientAppointments.filter(a => a.status === 'ABSENT').length, color: 'text-stone-500 border-stone-500/20 bg-stone-500/5' },
                  { label: 'Canceladas', value: patientAppointments.filter(a => a.status === 'CANCELLED').length, color: 'text-red-500 border-red-500/20 bg-red-500/5' }
                ].map(m => (
                  <div key={m.label} className={`border rounded-2xl p-4 flex flex-col justify-center text-center ${m.color}`}>
                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 dark:text-white block mb-1">{m.label}</span>
                    <span className="text-xl font-black font-sans leading-none">{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Sessions List */}
              {patientAppointments.length === 0 ? (
                <div className="border border-dashed border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-12 text-center text-stone-500 dark:text-white flex flex-col items-center justify-center">
                  <Calendar className="h-10 w-10 text-charcoal-700 mb-3" />
                  <p className="text-sm font-semibold">Nenhuma consulta agendada para este paciente</p>
                  <p className="text-xs text-charcoal-500 mt-1">Crie um agendamento na Agenda para visualizar o histórico aqui.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-[#e7e4dc] dark:border-charcoal-800 rounded-2xl">
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#e7e4dc] dark:border-charcoal-800 bg-[#f0ede6]/40 dark:bg-charcoal-900/40 text-[9px] font-black text-stone-400 dark:text-white uppercase tracking-widest">
                          <th className="py-3.5 px-5">Data & Hora</th>
                          <th className="py-3.5 px-5">Duração</th>
                          <th className="py-3.5 px-5">Preço</th>
                          <th className="py-3.5 px-5">Anotaçõeses</th>
                          <th className="py-3.5 px-5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7e4dc]/60 dark:divide-charcoal-850/60 font-sans font-medium text-charcoal-800 dark:text-charcoal-255 normal-case">
                        {patientAppointments.map((appt) => {
                          const getStatusBadge = (s: string) => {
                            switch (s) {
                              case 'CONFIRMED':
                                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider"><CheckCircle2 className="h-3 w-3" /> Presente</span>;
                              case 'PENDING':
                                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider"><Clock className="h-3 w-3" /> Pendente</span>;
                              case 'CANCELLED':
                                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider"><XCircle className="h-3 w-3" /> Cancelada</span>;
                              case 'ABSENT':
                                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black bg-stone-100 dark:bg-charcoal-800 text-stone-500 dark:text-charcoal-405 border border-stone-200 dark:border-charcoal-700 uppercase tracking-wider"><Minus className="h-3 w-3" /> Falta</span>;
                              default:
                                return s;
                            }
                          };

                          return (
                            <tr key={appt.id} className="hover:bg-[#faf9f6]/40 dark:hover:bg-charcoal-900/10">
                              <td className="py-3 px-5">
                                <span className="font-extrabold text-charcoal-900 dark:text-white block">{new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                <span className="text-[10px] text-stone-400 dark:text-charcoal-550 block font-mono">{appt.time.slice(0, 5)}h</span>
                              </td>
                              <td className="py-3 px-5 text-stone-550 dark:text-white font-mono">{appt.duration} min</td>
                              <td className="py-3 px-5 font-mono">
                                {appt.custom_price !== null && appt.custom_price !== undefined ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-extrabold">R$ {appt.custom_price.toFixed(2)}</span>
                                ) : (
                                  <span className="text-stone-400 dark:text-charcoal-555 italic">Padrãoo</span>
                                )}
                              </td>
                              <td className="py-3 px-5 max-w-[200px] truncate text-stone-500 dark:text-white" title={appt.notes || ''}>
                                {appt.notes || <span className="text-stone-400 dark:text-charcoal-550 italic font-normal">-</span>}
                              </td>
                              <td className="py-3 px-5 text-center">
                                {getStatusBadge(appt.status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB CONTENT: ATTACHMENTS --- */}
          {activeTab === 'attachments' && (
            <div className="glass-panel rounded-2xl p-6 space-y-6 border border-teal-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e7e4dc] dark:border-charcoal-800">
                <div>
                  <h3 className="font-bold text-charcoal-900 dark:text-white text-base">Espaço Virtual (Gestãoo de Documentos)</h3>
                  <p className="text-xs text-stone-500 dark:text-white mt-0.5">Os arquivos sãoo criptografados localmente com AES-256 no banco local offline.</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,image/*"
                />
              </div>

              {/* Dropzone Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    await uploadFile(file);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragOver
                    ? 'border-teal-500 bg-teal-500/10 text-teal-400 scale-[1.01]'
                    : 'border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/25 bg-[#fcfbf9]/30 dark:bg-charcoal-900/30'
                }`}
              >
                <Paperclip className={`h-8 w-8 ${isDragOver ? 'text-teal-400 animate-bounce' : 'text-teal-500'}`} />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-charcoal-900 dark:text-white">
                    Arraste e solte arquivos aqui para enviar
                  </h4>
                  <p className="text-[10px] text-stone-500 dark:text-white mt-1">
                    Aceita PDFs de contratos, laudos e atestados, ou clique para abrir o seletor.
                  </p>
                </div>
              </div>

              {attachments.length === 0 ? (
                <div className="border border-dashed border-[#e7e4dc] dark:border-teal-800/60 rounded-2xl p-12 text-center text-stone-500 dark:text-white flex flex-col items-center justify-center">
                  <Paperclip className="h-10 w-10 text-charcoal-700 mb-3" />
                  <p className="text-sm font-semibold">Nenhum anexo registrado neste prontuário</p>
                  <p className="text-xs text-charcoal-500 mt-1">Insira documentos em PDF ou imagens clínicas de forma segura.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachments.map((att) => {
                    const isEditingName = editingAttachmentId === att.id;
                    return (
                      <div 
                        key={att.id} 
                        className="bg-[#faf9f6] dark:bg-charcoal-950 border border-[#e7e4dc] dark:border-teal-800/60/80 hover:border-teal-500/15 rounded-xl p-4 flex justify-between items-center transition-all group"
                      >
                        <div className="space-y-0.5 max-w-[65%] flex-1 text-left">
                          {isEditingName ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingAttachmentName}
                                onChange={(e) => setEditingAttachmentName(e.target.value)}
                                className="w-full glass-input rounded-lg py-1 px-2 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameAttachment(att.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingAttachmentId(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleRenameAttachment(att.id)}
                                className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                                title="Salvar Novo Nome"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingAttachmentId(null)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <h4 className="text-sm font-bold text-charcoal-900 dark:text-white truncate" title={att.name}>{att.name}</h4>
                              <button
                                onClick={() => {
                                  setEditingAttachmentId(att.id);
                                  setEditingAttachmentName(att.name);
                                }}
                                className="opacity-0 group-hover/name:opacity-100 p-1 hover:bg-[#f0ede6] dark:hover:bg-charcoal-900 text-stone-500 hover:text-teal-500 rounded transition-all shrink-0"
                                title="Renomear Arquivo"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <p className="text-[10px] text-charcoal-500 font-semibold">Salvo em {new Date(att.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        
                        <div className="flex gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => handlePreviewAttachment(att.id)}
                            className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-teal-500 hover:border-teal-500/20 rounded-lg transition-all"
                            title="Visualizar Arquivo"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadAttachment(att.id, att.name, att.mime_type)}
                            className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-teal-500 hover:border-teal-500/20 rounded-lg transition-all"
                            title="Descarregar Arquivo"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-500 dark:text-white hover:text-red-400 hover:border-red-500/20 rounded-lg transition-all"
                            title="Apagar Arquivo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* --- TAB CONTENT: GENOGRAMA & ECOMAPA --- */}
          {activeTab === 'genogram' && selectedPatient && (
            <div className="glass-panel rounded-3xl p-5 border border-[#e7e4dc] dark:border-charcoal-800 animate-fadeIn flex flex-col flex-1 h-full min-h-0 overflow-hidden space-y-4">
              
              {/* Header with Title */}
              <div className="flex justify-between items-center pb-3 border-b border-[#e7e4dc] dark:border-charcoal-800 gap-4 shrink-0">
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider">Construtor de Genograma & Ecomapa</h3>
                  <p className="text-stone-500 dark:text-white text-xs">Mapeie as relaçõeses familiares e rede de apoio social do paciente.</p>
                </div>
                
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => {
                      setGenogramNodes([]);
                      setGenogramEdges([]);
                      setSelectedNodeId(null);
                    }}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    Limpar Tudo
                  </button>
                  <button
                    onClick={handleSaveGenogram}
                    className="flex items-center gap-1.5 bg-teal-gradient text-charcoal-950 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.01]"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Genograma
                  </button>
                </div>
              </div>

              {/* Layout: Center Canvas on the left (takes all remaining space), Right Properties */}
              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 h-full w-full overflow-hidden">
                
                {/* COLUMN 1: Canvas Area (Left, flex-1) */}
                <div className="flex-1 border border-[#e7e4dc] dark:border-charcoal-800 rounded-2xl relative overflow-hidden bg-[#fcfbf9]/40 dark:bg-charcoal-950/20 select-none flex flex-col h-full">
                  {genogramNodes.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-stone-500 dark:text-white">
                      <HelpCircle className="h-12 w-12 text-charcoal-700 mb-3 animate-pulse" />
                      <p className="font-bold text-charcoal-900 dark:text-white text-sm">Canvas Limpo</p>
                      <p className="text-[10px] text-stone-400 dark:text-charcoal-550 mt-1 max-w-xs text-center">
                        Clique nos botõees de Adicionar Membro à direita para começar.
                      </p>
                    </div>
                  ) : null}

                  <svg
                    width="100%"
                    height="100%"
                    className={`w-full h-full flex-1 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onClick={(e) => {
                      const targetId = (e.target as SVGElement).id;
                      if (e.target === e.currentTarget || targetId === 'canvas-bg') {
                        setSelectedNodeId(null);
                        setIsConnecting(false);
                      }
                    }}
                    onMouseDown={(e) => {
                      const targetId = (e.target as SVGElement).id;
                      if (e.target === e.currentTarget || targetId === 'canvas-bg') {
                        setIsPanning(true);
                        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (draggedNodeId) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.round((e.clientX - rect.left - panOffset.x) / zoomScale - dragOffset.x);
                        const y = Math.round((e.clientY - rect.top - panOffset.y) / zoomScale - dragOffset.y);
                        
                        const boundedX = Math.max(30, Math.min(rect.width / zoomScale - 30, x));
                        const boundedY = Math.max(30, Math.min(rect.height / zoomScale - 30, y));

                        setGenogramNodes(prev => prev.map(node => 
                          node.id === draggedNodeId ? { ...node, x: boundedX, y: boundedY } : node
                        ));
                      } else if (isPanning) {
                        const newX = e.clientX - panStart.x;
                        const newY = e.clientY - panStart.y;
                        setPanOffset({ x: newX, y: newY });
                      }
                    }}
                    onMouseUp={() => {
                      setDraggedNodeId(null);
                      setIsPanning(false);
                    }}
                    onMouseLeave={() => {
                      setDraggedNodeId(null);
                      setIsPanning(false);
                    }}
                  >
                    <defs>
                      <pattern id="canvas-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.2" fill="#e2dfd5" className="dark:fill-charcoal-800" />
                      </pattern>
                    </defs>
                    <rect id="canvas-bg" width="100%" height="100%" fill="url(#canvas-grid)" />

                    <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomScale})`} style={{ transformOrigin: 'top left', transition: isPanning ? 'none' : 'transform 0.1s ease-out' }}>
                    
                    {/* Relations Rendering */}
                    {genogramEdges.map((edge, idx) => {
                      const fromNode = genogramNodes.find(n => n.id === edge.from);
                      const toNode = genogramNodes.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const isEdgeSelected = selectedNodeId === `edge__${edge.from}__${edge.to}`;
                      const x1 = fromNode.x;
                      const y1 = fromNode.y;
                      const x2 = toNode.x;
                      const y2 = toNode.y;

                      const midX = (x1 + x2) / 2;
                      const calculatedMidY = (y1 + y2) / 2;
                      const d= x2 - x1;
                      const dy = y2 - y1;
                      const len = Math.sqrt(d* d+ dy * dy) || 1;
                      const perpX = -dy / len;
                      const perpY = d/ len;

                      const handleEdgeClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setSelectedNodeId(`edge__${edge.from}__${edge.to}`);
                        setIsConnecting(false);
                      };

                      const isHeteroCouple = (fromNode.gender === 'M' && toNode.gender === 'F') || (fromNode.gender === 'F' && toNode.gender === 'M');

                      const renderEdgeContent = () => {
                        if (edge.type === 'CONFLIT') {
                          const getZigZagPath = () => {
                            const steps = Math.floor(len / 10);
                            let path = `M ${x1} ${y1}`;
                            for (let i = 1; i < steps; i++) {
                              const t = i / steps;
                              const c= x1 + d* t;
                              const cy = y1 + dy * t;
                              const offset = (i % 2 === 0 ? 5 : -5);
                              path += ` L ${c+ perpX * offset} ${cy + perpY * offset}`;
                            }
                            path += ` L ${x2} ${y2}`;
                            return path;
                          };
                          return (
                            <path
                              d={getZigZagPath()}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={isEdgeSelected ? "4" : "2.5"}
                            />
                          );
                        }

                        if (edge.type === 'CLOSE') {
                          return (
                            <>
                              <line
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke="#72b0b0"
                                strokeWidth={isEdgeSelected ? "6" : "4.5"}
                              />
                              <line
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke="#ffffff"
                                className="dark:stroke-[#0e0e12]"
                                strokeWidth="1.8"
                              />
                            </>
                          );
                        }

                        if (edge.type === 'BROKEN') {
                          return (
                            <>
                              <line
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke="#78716c"
                                strokeWidth={isEdgeSelected ? "3.5" : "2"}
                              />
                              <line
                                x1={midX + perpX * 7 - d/ len * 4} y1={calculatedMidY + perpY * 7 - dy / len * 4}
                                x2={midX - perpX * 7 - d/ len * 4} y2={calculatedMidY - perpY * 7 - dy / len * 4}
                                stroke="#ef4444" strokeWidth="2.5"
                              />
                              <line
                                x1={midX + perpX * 7 + d/ len * 4} y1={calculatedMidY + perpY * 7 + dy / len * 4}
                                x2={midX - perpX * 7 + d/ len * 4} y2={calculatedMidY - perpY * 7 + dy / len * 4}
                                stroke="#ef4444" strokeWidth="2.5"
                              />
                            </>
                          );
                        }

                        if (edge.type === 'DISTANT') {
                          return (
                            <line
                              x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke="#78716c"
                              strokeWidth={isEdgeSelected ? "3.5" : "2"}
                              strokeDasharray="4 4"
                            />
                          );
                        }

                        return (
                          <line
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isEdgeSelected ? "#72b0b0" : "#a8a29e"}
                            strokeWidth={isEdgeSelected ? "3.5" : "2"}
                          />
                        );
                      };

                      return (
                        <g key={idx} className="cursor-pointer" onClick={handleEdgeClick}>
                          {renderEdgeContent()}
                          
                          {/* Botãoo de adicionar filho no meio do casal */}
                          {isHeteroCouple && (
                            <g 
                              onClick={(e) => handleAddChild(e, fromNode.id, toNode.id)}
                              className="group/btn"
                            >
                              <circle 
                                cx={midX} 
                                cy={calculatedMidY} 
                                r="9" 
                                className="fill-[#10b981] hover:fill-[#059669] stroke-white dark:stroke-charcoal-950 transition-colors" 
                                strokeWidth="1.5" 
                              />
                              <text 
                                x={midX} 
                                y={calculatedMidY + 3} 
                                textAnchor="middle" 
                                className="fill-white font-sans text-[10px] font-black pointer-events-none select-none"
                              >
                                +
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Nodes Rendering */}
                    {genogramNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      
                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          className="cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                            
                            const svg = e.currentTarget.ownerSVGElement || e.currentTarget.closest('svg');
                            if (svg) {
                              const rect = svg.getBoundingClientRect();
                              const mouseX = e.clientX - rect.left;
                              const mouseY = e.clientY - rect.top;
                              setDragOffset({
                                x: (mouseX - panOffset.x) / zoomScale - node.x,
                                y: (mouseY - panOffset.y) / zoomScale - node.y
                              });
                            }
                            setDraggedNodeId(node.id);

                            if (isConnecting && selectedNodeId && selectedNodeId !== node.id && !selectedNodeId.startsWith('edge__')) {
                              const alreadyExists = genogramEdges.some(e => 
                                (e.from === selectedNodeId && e.to === node.id) || 
                                (e.from === node.id && e.to === selectedNodeId)
                              );
                              if (!alreadyExists) {
                                setGenogramEdges(prev => [...prev, {
                                  from: selectedNodeId,
                                  to: node.id,
                                  type: connectionType
                                }]);
                              }
                              setIsConnecting(false);
                            }
                          }}
                        >
                          {node.gender === 'F' && (
                            <circle
                              cx="0" cy="0" r="18"
                              className="fill-[#fdf2f8] dark:fill-[#200b14] transition-colors"
                              stroke={isSelected ? "#72b0b0" : "#ec4899"}
                              strokeWidth={isSelected ? "3.5" : "2.5"}
                            />
                          )}

                          {node.gender === 'M' && (
                            <rect
                              x="-18" y="-18" width="36" height="36"
                              className="fill-[#eff6ff] dark:fill-[#0b1329] transition-colors"
                              stroke={isSelected ? "#72b0b0" : "#3b82f6"}
                              strokeWidth={isSelected ? "3.5" : "2.5"}
                            />
                          )}

                          {node.gender === 'ORG' && (
                            <rect
                              x="-26" y="-18" width="52" height="36" rx="6"
                              className="fill-[#ecfdf5] dark:fill-[#081a12] transition-colors"
                              stroke={isSelected ? "#72b0b0" : "#10b981"}
                              strokeWidth={isSelected ? "3.5" : "2.5"}
                              strokeDasharray="4 3"
                            />
                          )}

                          {node.gender === 'INST' && (
                            <rect
                              x="-22" y="-18" width="44" height="36" rx="4"
                              className="fill-[#fff7ed] dark:fill-[#24120a] transition-colors"
                              stroke={isSelected ? "#72b0b0" : "#f97316"}
                              strokeWidth={isSelected ? "3.5" : "2.5"}
                            />
                          )}

                          <text
                            y="34"
                            textAnchor="middle"
                            className="text-[10px] font-sans font-extrabold uppercase tracking-wider fill-charcoal-900 dark:fill-white text-shadow-sm select-none pointer-events-none"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                    </g>
                  </svg>

                  {/* Zoom Controls */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#ffffff]/90 dark:bg-charcoal-900/90 border border-[#e7e4dc] dark:border-charcoal-800 p-1.5 rounded-xl shadow-md z-10">
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                      className="p-1.5 hover:bg-[#f0ede6] dark:hover:bg-charcoal-800 rounded-lg text-stone-600 dark:text-charcoal-300 transition-colors"
                      title="Zoom Out"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[9px] font-sans font-black text-stone-500 dark:text-white px-1 select-none min-w-[32px] text-center">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomScale(prev => Math.min(2, prev + 0.1))}
                      className="p-1.5 hover:bg-[#f0ede6] dark:hover:bg-charcoal-800 rounded-lg text-stone-600 dark:text-charcoal-300 transition-colors"
                      title="Zoom In"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(1)}
                      className="p-1.5 hover:bg-[#f0ede6] dark:hover:bg-charcoal-800 rounded-lg text-[9px] font-bold text-teal-600 transition-colors border-l border-[#e7e4dc] dark:border-charcoal-800 ml-1 pl-2"
                      title="Reset Zoom"
                    >
                      100%
                    </button>
                  </div>
                </div>

                {/* COLUMN 3: Properties Panel & Manual Connection (Right) */}
                <div className="w-full lg:w-60 shrink-0 h-full overflow-y-auto space-y-4 text-left pl-1">
                  
                  {/* toolboat top */}
                  <div className="glass-panel p-4 rounded-2xl border border-[#e7e4dc] dark:border-charcoal-800 space-y-3 text-left">
                    <h4 className="font-extrabold text-[9px] text-[#b89025] uppercase tracking-widest pb-1 border-b border-[#e7e4dc] dark:border-charcoal-800/60 mb-1.5">
                      Adicionar Membro / Figura
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Homem */}
                      <button
                        onClick={() => handleQuickAddNode('M')}
                        className="aspect-square bg-[#ffffff] dark:bg-charcoal-900/60 hover:bg-blue-500/5 dark:hover:bg-blue-950/15 border border-[#e7e4dc] dark:border-charcoal-800 hover:border-blue-500/40 rounded-xl p-3 flex flex-col items-center justify-between transition-all group active:scale-95"
                        title="Adicionar Homem"
                      >
                        <div className="w-10 h-10 border-2 border-blue-500 bg-blue-500/5 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                          <span className="text-[10px] text-blue-500 font-black">M</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-stone-600 dark:text-charcoal-350 uppercase tracking-wider text-center block mt-1">Homem</span>
                      </button>

                      {/* Mulher */}
                      <button
                        onClick={() => handleQuickAddNode('F')}
                        className="aspect-square bg-[#ffffff] dark:bg-charcoal-900/60 hover:bg-pink-500/5 dark:hover:bg-pink-950/15 border border-[#e7e4dc] dark:border-charcoal-800 hover:border-pink-500/40 rounded-xl p-3 flex flex-col items-center justify-between transition-all group active:scale-95"
                        title="Adicionar Mulher"
                      >
                        <div className="w-10 h-10 border-2 border-pink-500 bg-pink-500/5 rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
                          <span className="text-[10px] text-pink-500 font-black">F</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-stone-600 dark:text-charcoal-350 uppercase tracking-wider text-center block mt-1">Mulher</span>
                      </button>

                      {/* Rede de Apoio / Amigo */}
                      <button
                        onClick={() => handleQuickAddNode('ORG')}
                        className="aspect-square bg-[#ffffff] dark:bg-charcoal-900/60 hover:bg-emerald-500/5 dark:hover:bg-emerald-950/15 border border-[#e7e4dc] dark:border-charcoal-800 hover:border-emerald-500/40 rounded-xl p-3 flex flex-col items-center justify-between transition-all group active:scale-95"
                        title="Adicionar Rede de Apoio"
                      >
                        <div className="w-12 h-8 border-2 border-dashed border-emerald-500 bg-emerald-500/5 rounded-md flex items-center justify-center transition-transform group-hover:scale-105 my-1">
                          <span className="text-[8px] text-emerald-500 font-black">Apoio</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-stone-600 dark:text-charcoal-350 uppercase tracking-wider text-center block mt-1 line-clamp-1 leading-none">Rede / Amigo</span>
                      </button>

                      {/* Instituiçõeses */}
                      <button
                        onClick={() => handleQuickAddNode('INST')}
                        className="aspect-square bg-[#ffffff] dark:bg-charcoal-900/60 hover:bg-orange-500/5 dark:hover:bg-orange-950/15 border border-[#e7e4dc] dark:border-charcoal-800 hover:border-orange-500/40 rounded-xl p-3 flex flex-col items-center justify-between transition-all group active:scale-95"
                        title="Adicionar Instituiçãoo"
                      >
                        <div className="w-12 h-8 border-2 border-orange-500 bg-orange-500/5 rounded-sm flex items-center justify-center transition-transform group-hover:scale-105 my-1">
                          <span className="text-[8px] text-orange-500 font-black">Inst</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-stone-600 dark:text-charcoal-350 uppercase tracking-wider text-center block mt-1 line-clamp-1 leading-none">Instituiçõeses</span>
                      </button>
                    </div>
                  </div>

                  {/* Properties of Selected Element */}
                  {selectedNodeId && (
                    <div className="glass-panel p-3 rounded-xl border border-teal-700/40 space-y-2.5 animate-fadeIn bg-gold-500/5 text-[10px]">
                      {selectedNodeId.startsWith('edge__') ? (
                        <>
                          <h4 className="font-extrabold text-[9px] text-[#b89025] uppercase tracking-widest pb-0.5 border-b border-[#e7e4dc] dark:border-charcoal-800/60">
                            Relação Selecionada
                          </h4>
                          
                          <div className="space-y-1">
                            <label className="block text-[8px] text-stone-500 dark:text-charcoal-455 uppercase font-bold tracking-wider">Tipo de Relação</label>
                            <select
                              value={
                                (() => {
                                  const parts = selectedNodeId.split('__');
                                  const edge = genogramEdges.find(e => 
                                    (e.from === parts[1] && e.to === parts[2]) ||
                                    (e.from === parts[2] && e.to === parts[1])
                                  );
                                  return edge ? edge.type : 'NORMAL';
                                })()
                              }
                              onChange={(e) => {
                                const parts = selectedNodeId.split('__');
                                const newType = e.target.value;
                                setGenogramEdges(prev => prev.map(edge => 
                                  ((edge.from === parts[1] && edge.to === parts[2]) ||
                                   (edge.from === parts[2] && edge.to === parts[1]))
                                    ? { ...edge, type: newType } : edge
                                ));
                              }}
                              className="w-full glass-input rounded-lg py-1.5 px-2 text-charcoal-900 dark:text-white text-xs outline-none font-sans bg-white dark:bg-charcoal-900"
                            >
                              <option value="NORMAL">Normal / Neutra</option>
                              <option value="CLOSE">Próxima / Unida (Dupla Linha)</option>
                              <option value="CONFLIT">Conflituosa (Ziguezague Vermelho)</option>
                              <option value="BROKEN">Rompida (Cortes no Meio)</option>
                              <option value="DISTANT">Distante (Tracejada)</option>
                            </select>
                          </div>
                          
                          <button
                            onClick={() => {
                              const parts = selectedNodeId.split('__');
                              setGenogramEdges(prev => prev.filter(e => 
                                !((e.from === parts[1] && e.to === parts[2]) ||
                                  (e.from === parts[2] && e.to === parts[1]))
                              ));
                              setSelectedNodeId(null);
                            }}
                            className="w-full py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                          >
                            Excluir Relação
                          </button>
                        </>
                      ) : (
                        <>
                          <h4 className="font-extrabold text-[9px] text-[#b89025] uppercase tracking-widest pb-0.5 border-b border-[#e7e4dc] dark:border-charcoal-800/60">
                            Propriedades do Nó
                          </h4>
                          
                          <div className="space-y-1">
                            <label className="block text-[8px] text-stone-500 dark:text-charcoal-455 uppercase font-bold tracking-wider">Nome / Rótulo</label>
                            <input
                              type="text"
                              value={genogramNodes.find(n => n.id === selectedNodeId)?.label || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGenogramNodes(prev => prev.map(n => 
                                  n.id === selectedNodeId ? { ...n, label: val } : n
                                ));
                              }}
                              className="w-full glass-input rounded-lg py-1.5 px-2 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                            />
                          </div>

                          {/* Connection Dropdown Section */}
                          <div className="pt-2 border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="block text-[8px] text-stone-500 dark:text-charcoal-455 uppercase font-bold tracking-wider">Conectar a</label>
                              <select
                                value={sidebarConnectTargetId}
                                onChange={(e) => {
                                  const targetId = e.target.value;
                                  if (!targetId || !selectedNodeId) return;
                                  
                                  const alreadyExists = genogramEdges.some(edge => 
                                    (edge.from === selectedNodeId && edge.to === targetId) || 
                                    (edge.from === targetId && edge.to === selectedNodeId)
                                  );
                                  
                                  if (alreadyExists) {
                                    setGenogramEdges(prev => prev.map(edge => 
                                      ((edge.from === selectedNodeId && edge.to === targetId) || 
                                       (edge.from === targetId && edge.to === selectedNodeId))
                                        ? { ...edge, type: connectionType } : edge
                                    ));
                                  } else {
                                    setGenogramEdges(prev => [...prev, {
                                      from: selectedNodeId,
                                      to: targetId,
                                      type: connectionType
                                    }]);
                                  }
                                  setSidebarConnectTargetId('');
                                }}
                                className="w-full glass-input rounded-lg py-1.5 px-2 text-charcoal-900 dark:text-white text-xs outline-none font-sans bg-white dark:bg-charcoal-900"
                              >
                                <option value="">Escolha...</option>
                                {genogramNodes.filter(n => n.id !== selectedNodeId).map(n => (
                                  <option key={n.id} value={n.id}>{n.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-0.5">
                              <label className="block text-[8px] text-stone-500 dark:text-charcoal-455 uppercase font-bold tracking-wider">Traço</label>
                              <select
                                value={connectionType}
                                onChange={(e) => setConnectionType(e.target.value as any)}
                                className="w-full glass-input rounded-lg py-1.5 px-2 text-charcoal-900 dark:text-white text-xs outline-none font-sans bg-white dark:bg-charcoal-900"
                              >
                                <option value="NORMAL">Normal</option>
                                <option value="CLOSE">Duplo</option>
                                <option value="CONFLIT">Zigue</option>
                                <option value="BROKEN">Cortado</option>
                                <option value="DISTANT">Tracejado</option>
                              </select>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setGenogramNodes(prev => prev.filter(n => n.id !== selectedNodeId));
                              setGenogramEdges(prev => prev.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId));
                              setSelectedNodeId(null);
                              setIsConnecting(false);
                            }}
                            className="w-full py-1.5 mt-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                          >
                            Excluir Membro
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {!selectedNodeId && (
                    <div className="glass-panel p-3.5 rounded-xl border border-dashed border-[#e7e4dc] dark:border-charcoal-800 text-center text-stone-400 dark:text-charcoal-550 text-xs">
                      <HelpCircle className="h-5 w-5 text-charcoal-700 mx-auto mb-1.5" />
                      Clique em um membro ou laço no Canvas para editar.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* --- TAB CONTENT: MAPEAMENTO FARMACOLÓGICO --- */}
          {activeTab === 'pharma' && selectedPatient && (
            <div className="glass-panel rounded-3xl p-6 border border-[#e7e4dc] dark:border-charcoal-800 animate-fadeIn space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[#e7e4dc] dark:border-charcoal-800">
                <div>
                  <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider">Mapeamento Farmacológico e Linha de Substâncias</h3>
                  <p className="text-stone-500 dark:text-white text-xs">Acompanhamento de medicamentos e alteração de dosagens prescritas pelo psiquiatra.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingMedId(null);
                    setMedName('');
                    setMedDosage('');
                    setMedStartDate(new Date().toISOString().slice(0, 10));
                    setMedEndDate('');
                    setMedStatus('ACTIVE');
                    setMedNotes('');
                    setIsAddingMed(true);
                  }}
                  className="flex items-center gap-1.5 bg-teal-gradient text-charcoal-950 px-5 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-wider shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Registrar Medicamento
                </button>
              </div>

              {isAddingMed && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!medName.trim() || !medDosage.trim()) return;

                    const newMedObj = {
                      id: editingMedId || `med-${Date.now()}`,
                      name: medName.trim(),
                      dosage: medDosage.trim(),
                      startDate: medStartDate,
                      endDate: medEndDate || undefined,
                      status: medStatus,
                      notes: medNotes.trim()
                    };

                    let updated;
                    if (editingMedId) {
                      updated = medications.map(m => m.id === editingMedId ? newMedObj : m);
                    } else {
                      updated = [...medications, newMedObj];
                    }

                    handleSaveMedications(updated);
                    setIsAddingMed(false);
                  }} 
                  className="glass-panel p-5 rounded-2xl border border-teal-700/40 space-y-4 text-xs font-bold text-stone-600 dark:text-charcoal-300 uppercase tracking-wider animate-fadeIn"
                >
                  <h4 className="font-extrabold text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-widest pb-1 border-b border-charcoal-800">
                    {editingMedId ? 'Editar Registro Farmacológico' : 'Novo Registro de Medicação / Substância'}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-stone-500 dark:text-white">Substância / Medicamento</label>
                      <input
                        type="text"
                        value={medName}
                        onChange={(e) => setMedName(e.target.value)}
                        className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                        placeholder="Ex: Escitalopram, Ritalina, CBD"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-stone-500 dark:text-white">Dosagem e Posologia</label>
                      <input
                        type="text"
                        value={medDosage}
                        onChange={(e) => setMedDosage(e.target.value)}
                        className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                        placeholder="Ex: 10mg ao acordar"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Estado Atual</label>
                      <select
                        value={medStatus}
                        onChange={(e) => setMedStatus(e.target.value as any)}
                        className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans bg-white dark:bg-charcoal-900"
                      >
                        <option value="ACTIVE">Ativo / Em uso</option>
                        <option value="CHANGED">Dosagem Alterada</option>
                        <option value="SUSPENDED">Suspenso / Descontinuado</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-stone-500 dark:text-white">Data de Início</label>
                      <input
                        type="date"
                        value={medStartDate}
                        onChange={(e) => setMedStartDate(e.target.value)}
                        className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-stone-500 dark:text-white">Data de Alteração/Fim (Opcional)</label>
                      <input
                        type="date"
                        value={medEndDate}
                        onChange={(e) => setMedEndDate(e.target.value)}
                        className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-stone-500 dark:text-white">Anotaçõeses do Psiquiatra / Histórico Clínico</label>
                    <textarea
                      value={medNotes}
                      onChange={(e) => setMedNotes(e.target.value)}
                      rows={2}
                      className="w-full glass-input rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none resize-none font-sans"
                      placeholder="Ex: Introduzido pelo psiquiatra Dr. Nelson. Paciente relatou cefaleia leve nos 3 primeiros dias..."
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#e7e4dc] dark:border-charcoal-800">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-teal-gradient text-charcoal-950 rounded-xl text-xs font-black uppercase tracking-wider"
                    >
                      <Save className="h-4 w-4 inline-block mr-1" />
                      Salvar Registro
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingMed(false)}
                      className="px-4 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {!Array.isArray(medications) || medications.length === 0 ? (
                <div className="border border-dashed border-[#e7e4dc] dark:border-teal-800/60 rounded-2xl p-12 text-center text-stone-500 dark:text-white">
                  <Activity className="h-10 w-10 text-charcoal-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Nenhum registro de medicação associado ao paciente</p>
                  <p className="text-xs text-charcoal-500 mt-1">Gere uma linha do tempo farmacológica registrando o histórico de substâncias.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-[#e7e4dc] dark:border-charcoal-800 ml-4 space-y-6">
                  {Array.isArray(medications) && medications
                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                    .map((med) => {
                      const isActive = med.status === 'ACTIVE';
                      const isChanged = med.status === 'CHANGED';

                      return (
                        <div key={med.id} className="relative group animate-fadeIn">
                          <div 
                            className={`absolute -left-[32px] top-1.5 w-5 h-5 rounded-full border-4 border-[#ffffff] dark:border-[#0e0e12] flex items-center justify-center ${
                              isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                              isChanged ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          >
                          </div>

                          <div className="glass-panel p-5 rounded-2xl border border-[#e7e4dc] dark:border-charcoal-800 hover-card-premium relative">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingMedId(med.id);
                                  setMedName(med.name);
                                  setMedDosage(med.dosage);
                                  setMedStartDate(med.startDate);
                                  setMedEndDate(med.endDate || '');
                                  setMedStatus(med.status);
                                  setMedNotes(med.notes || '');
                                  setIsAddingMed(true);
                                }}
                                className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-teal-400 rounded-lg transition-all"
                                title="Editar Medicamento"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  triggerConfirm(
                                    'Excluir Medicação',
                                    `Tem certeza de que deseja apagar o registro do medicamento ${med.name}?`,
                                    () => {
                                      const updated = medications.filter(m => m.id !== med.id);
                                      handleSaveMedications(updated);
                                    },
                                    'danger'
                                  );
                                }}
                                className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-500 dark:text-white hover:text-red-400 rounded-lg transition-all"
                                title="Excluir Registro"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mb-2.5">
                              <h4 className="text-base font-bold text-charcoal-900 dark:text-white font-sans">{med.name}</h4>
                              <span className="text-[11px] font-sans font-black text-charcoal-700 dark:text-charcoal-300 bg-stone-100 dark:bg-charcoal-900/60 px-2 py-0.5 rounded-lg">
                                {med.dosage}
                              </span>
                              <span 
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                  isActive ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' :
                                  isChanged ? 'border-amber-500/20 bg-amber-500/5 text-amber-500' :
                                  'border-red-500/20 bg-red-500/5 text-red-500'
                                }`}
                              >
                                {isActive && 'Em Uso / Ativo'}
                                {isChanged && 'Dosagem Alterada'}
                                {!isActive && !isChanged && 'Descontinuado'}
                              </span>
                            </div>

                            <div className="flex gap-2 text-[10px] text-stone-400 dark:text-white font-black uppercase tracking-wider mb-3">
                              <span>Início: {new Date(med.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              {med.endDate && (
                                <span> • Fim/Alteração: {new Date(med.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              )}
                            </div>

                            {med.notes && (
                              <p className="text-xs text-stone-600 dark:text-charcoal-300 font-sans italic leading-relaxed normal-case border-l-2 border-teal-500/20 pl-3">
                                "{med.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* --- TAB CONTENT: SETTINGS (DADOS E EXCLUSÃO) --- */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-6 w-full text-left">
              {/* Informações Gerais de Contato */}
              <div className="glass-panel rounded-2xl p-6 space-y-6 border border-teal-800/40 w-full">
                <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider pb-2 border-b border-[#e7e4dc] dark:border-charcoal-800">
                  Ficha de Identificação Cadastral
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm font-sans">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block mb-0.5">CPF</span>
                    <span className="text-charcoal-900 dark:text-white font-semibold text-sm">{selectedPatient.cpf || 'Não preenchido'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-charcoal-455 block mb-0.5">Data de Nascimento</span>
                    <span className="text-charcoal-900 dark:text-white font-semibold text-sm">
                      {selectedPatient.birth_date ? new Date(selectedPatient.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não cadastrado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block mb-0.5">WhatsApp / Contato</span>
                    <span className="text-charcoal-900 dark:text-white font-semibold text-sm">{selectedPatient.phone}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block mb-0.5">Contato de Emergência</span>
                    <span className="text-charcoal-900 dark:text-white font-semibold text-sm">{selectedPatient.emergency_contact || 'Não cadastrado'}</span>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block mb-0.5">Endereço Residencial</span>
                    <span className="text-charcoal-900 dark:text-white font-semibold text-sm">{selectedPatient.address || 'Não cadastrado'}</span>
                  </div>
                  <div className="col-span-2 md:col-span-1 border-l-0 md:border-l border-[#e7e4dc] dark:border-charcoal-800 pl-0 md:pl-6">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block mb-0.5">Cadastrado no Sistema</span>
                    <span className="text-stone-500 dark:text-white text-xs font-semibold">{new Date(selectedPatient.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Hard Delete Card (LGPD) */}
              <div className="glass-panel rounded-2xl p-6 border border-red-500/25 bg-red-950/5 flex flex-col md:flex-row gap-6 items-center justify-between w-full">
                <div className="flex-1 text-left space-y-2">
                  <div className="flex items-center gap-2 text-red-500 font-extrabold text-sm uppercase tracking-wider">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                    Eliminação Permanente de Prontuário (Direito de Exclusão LGPD)
                  </div>
                  <p className="text-xs text-stone-600 dark:text-charcoal-300 leading-relaxed font-sans max-w-2xl">
                    Ao acionar este recurso, a ficha cadastral do paciente e <strong>todos</strong> os seus dados associados (consultas, timelines, anexos em PDF, genogramas e históricos) serãoo excluídos fisicamente do banco de dados local com exclusãoo irreversível. Certifique-se de realizar o download do dossiê em PDF antes se desejar guardar algum registro físico.
                  </p>
                </div>

                <div className="w-full md:w-80 shrink-0 flex flex-col gap-2.5 bg-black/5 dark:bg-charcoal-950/20 border border-red-500/10 p-4 rounded-xl">
                  <label className="block text-[9px] font-bold text-stone-500 dark:text-charcoal-455 uppercase tracking-widest">
                    Escreva <span className="text-red-500 font-black">EXCLUIR</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    className="w-full glass-input rounded-lg py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none uppercase font-black tracking-widest text-center border-red-500/20 focus:border-red-500/40"
                    placeholder="EXCLUIR"
                  />
                  <button
                    onClick={handleHardDeletePatient}
                    disabled={deleteConfirmationText !== 'EXCLUIR'}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-550/10 text-white font-extrabold py-2 px-4 rounded-lg transition-all shadow-md disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      ) : (
        /* --- LIST VIEW --- */
        <div className="space-y-6">
          {/* Row combining search and new patient button */}
          <div className="flex gap-4 items-center w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 dark:text-white" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full glass-input rounded-xl py-3.5 pl-12 pr-4 text-charcoal-900 dark:text-white text-sm outline-none placeholder-charcoal-400"
                placeholder="Digite o nome ou CPF do paciente para buscar..."
              />
            </div>
            <button
              onClick={() => {
                setEditingPatient(null);
                setName(''); setCpf(''); setBirthDate(''); setPhone(''); setAddress(''); setEmergencyContact('');
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 uiverse-btn-gold text-white px-5 py-3.5 rounded-xl transition-all text-xs font-black uppercase tracking-wider shadow-lg shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Novo Paciente
            </button>
          </div>

          {/* Patients Grid */}
          {filteredPatients.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center text-stone-500 dark:text-white flex flex-col items-center justify-center border-teal-800/40">
              <Users className="h-14 w-14 text-charcoal-700 mb-3 animate-pulse" />
              <p className="font-bold text-charcoal-900 dark:text-white text-base">Nenhum Paciente Encontrado</p>
              <p className="text-xs text-charcoal-500 mt-1">Nenhum cadastro coincide com os critérios de busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPatients.map((p) => (
                <div 
                  key={p.id}
                  className="glass-panel-teal rounded-2xl p-5 border border-teal-800/40 hover-card-premium flex flex-col justify-between h-[180px] group cursor-pointer"
                  onClick={() => handleViewPatient(p.id)}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 text-teal-500 rounded-xl">
                        <User className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-500 dark:text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                        Prontuário #{p.id}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-charcoal-900 dark:text-white text-base mt-4 group-hover:text-teal-400 transition-colors truncate font-sans tracking-wide">{p.name}</h3>
                    <p className="text-xs text-stone-500 dark:text-white mt-1 font-sans">WhatsApp: {p.phone || 'Não informado'}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#e7e4dc] dark:border-teal-800/60/80 text-[10px] font-black text-teal-500 uppercase tracking-widest">
                    <span>Acessar Prontuário</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- ADD/EDIT MODAL OVERLAY --- */}
      {showAddForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="glass-panel-teal rounded-3xl p-6 max-w-md w-full border border-teal-500/25 shadow-2xl space-y-6 animate-scaleIn">
            <div>
              <h3 className="text-lg font-black text-charcoal-900 dark:text-white uppercase tracking-wide">Novo Cadastro de Paciente</h3>
              <p className="text-xs text-stone-500 dark:text-white mt-0.5 font-semibold">Os dados iniciais cadastrados sãoo encriptados localmente.</p>
            </div>

            <form onSubmit={handleSavePatient} className="space-y-4 text-xs font-bold text-stone-600 dark:text-charcoal-300 uppercase tracking-wider">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 dark:text-white">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans"
                    placeholder="Nome completo do paciente"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-stone-500 dark:text-white">CPF</label>
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] text-stone-500 dark:text-white">Nascimento</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Telefone (WhatsApp)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans"
                    placeholder="(00) 90000-0000"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Endereço Residencial</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans"
                    placeholder="Rua, número, cidade"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-stone-500 dark:text-charcoal-455">Jornada Clínica (Status)</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans bg-white dark:bg-charcoal-900 font-bold"
                  >
                    <option value="FILA_ESPERA">Fila de Espera</option>
                    <option value="AVALIACAO_INICIAL">Avaliação Inicial</option>
                    <option value="EM_TERAPIA">Em Terapia</option>
                    <option value="PREPARACAO_ALTA">Preparação para Alta</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e7e4dc] dark:border-teal-800/60">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-charcoal-900 dark:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-gradient text-charcoal-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 uppercase"
                >
                  <Save className="h-4 w-4" />
                  Gravar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EMERGENCY POPUP MODAL --- */}
      {showEmergencyModal && selectedPatient && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999] animate-fadeIn text-left">
          <div className="bg-[#ffffff] dark:bg-charcoal-950 border border-red-500/20 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-scaleIn relative overflow-hidden">
            {/* Top red warning stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shadow-[0_2px_10px_rgba(239,68,68,0.3)]"></div>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 bg-red-500/10 text-red-500 rounded-xl shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-xl bg-red-400 opacity-20"></span>
                <AlertTriangle className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-600 dark:text-red-500 uppercase tracking-wider">Contençãoo e Emergência Médica</h3>
                <p className="text-[10px] text-stone-500 dark:text-white font-bold uppercase tracking-widest mt-0.5">Ficha de Resposta Rápida a Crises</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              {/* Card 1: Paciente */}
              <div className="bg-stone-50 dark:bg-charcoal-900/60 p-4 border border-[#e7e4dc] dark:border-charcoal-800 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block">Paciente</span>
                <h4 className="text-sm font-black text-charcoal-900 dark:text-white truncate">{selectedPatient.name}</h4>
                <p className="text-[10px] text-stone-500 dark:text-white mt-1">Contato: {selectedPatient.phone}</p>
              </div>

              {/* Card 2: Contato de Urgência */}
              <div className="bg-stone-50 dark:bg-charcoal-900/60 p-4 border border-[#e7e4dc] dark:border-charcoal-800 rounded-2xl space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-charcoal-455 block">Contato de Urgência (Familiar)</span>
                <h4 className="text-sm font-black text-charcoal-900 dark:text-white font-sans">{selectedPatient.emergency_contact || 'Nenhum cadastrado'}</h4>
                <p className="text-[10px] text-stone-500 dark:text-white mt-1">Vínculo familiar de referência</p>
              </div>

              {/* Card 3: Psiquiatra de Referência */}
              <div className="bg-stone-50 dark:bg-charcoal-900/60 p-4 border border-[#e7e4dc] dark:border-charcoal-800 rounded-2xl space-y-1 md:col-span-2">
                <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 dark:text-white block">Psiquiatra de Apoio / Referência</span>
                <h4 className="text-sm font-black text-charcoal-900 dark:text-white font-sans">{selectedPatient.psychiatrist_contact || 'Não informado / Sem acompanhamento'}</h4>
                <p className="text-[10px] text-stone-500 dark:text-white mt-1">Médico responsável pela farmacologia do paciente</p>
              </div>

              {/* Card 4: Alergias e Condiçõeses Clínicas Clínicas (Full Width) */}
              <div className="bg-red-500/5 dark:bg-red-950/10 border border-red-500/20 p-4 rounded-2xl md:col-span-2 space-y-1.5">
                <span className="text-[9px] uppercase font-bold tracking-widest text-red-500 dark:text-red-400 block">Condiçõeses Médicas & Restriçõeses Clínicas</span>
                <p className="text-xs font-semibold text-stone-700 dark:text-red-300 normal-case whitespace-pre-wrap leading-relaxed">
                  {selectedPatient.medical_conditions || 'Nenhuma restriçãoo clínica, condiçãoo médica de risco ou alergia grave registrada no prontuário.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full bg-[#f0ede6] dark:bg-charcoal-900 hover:bg-[#e2dfd5] dark:hover:bg-charcoal-800 text-stone-600 dark:text-charcoal-350 border border-[#e7e4dc] dark:border-charcoal-800 py-3 rounded-xl uppercase font-black tracking-widest text-xs transition-all text-center"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
