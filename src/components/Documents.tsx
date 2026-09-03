import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Patient } from '../services/db';
import { jsPDF } from 'jspdf';
import { 
  FileText, Download, Clock, DollarSign, Send, CheckCircle2 
} from 'lucide-react';

interface DocumentsProps {
  professionalName: string;
  professionalCrp: string;
  professionalContact: string;
}

type DocType = 'DECLARATION' | 'RECEIPT' | 'REPORT' | 'REFERRAL';

export const Documents: React.FC<DocumentsProps> = ({
  professionalName,
  professionalCrp,
  professionalContact
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  
  // Document Type selection: 'DECLARATION' | 'RECEIPT' | 'REPORT' | 'REFERRAL'
  const [docType, setDocType] = useState<DocType>('DECLARATION');

  // Common fields
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Declaration fields
  const [timeStart, setTimeStart] = useState('14:00');
  const [timeEnd, setTimeEnd] = useState('14:50');

  // Receipt fields
  const [receiptValue, setReceiptValue] = useState<number>(150);
  const [receiptDescription, setReceiptDescription] = useState('sessão de psicoterapia clínica individual');

  // Report fields
  const [reportDemand, setReportDemand] = useState('');
  const [reportAnalysis, setReportAnalysis] = useState('');
  const [reportConclusion, setReportConclusion] = useState('');

  // Referral fields
  const [referralText, setReferralText] = useState('Encaminho o(a) paciente acima identificado(a) para avaliação clínica especializada com profissional médico psiquiatra, com a finalidade de investigação diagnóstica complementar e conduta integrada.');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await dbService.query<Patient>('SELECT id, name, cpf FROM patients');
      setPatients(data);
      if (data.length > 0) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar pacientes para documentos:', err);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const getHeader = (doc: jsPDF) => {
    let y = 18;
    
    // Draw whole header line in normal Helvetica 9, gray color
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    
    const headerText = `${professionalName} - Psicólogo  |  CRP: ${professionalCrp}  |  Contato: ${professionalContact}`;
    doc.text(headerText, 105, y, { align: 'center' });
    
    y += 4;
    // Dual lines separator
    doc.setDrawColor(45, 112, 112);
    doc.setLineWidth(0.8);
    doc.line(15, y, 195, y);
    
    doc.setDrawColor(45, 112, 112);
    doc.setLineWidth(0.2);
    doc.line(15, y + 1.2, 195, y + 1.2);
    
    return y + 18;
  };

  const getFooter = (doc: jsPDF, pageHeight: number) => {
    const y = pageHeight - 40;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.line(60, y, 150, y);
    
    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(professionalName, 105, y + 5.5, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8.5);
    doc.text(`Psicólogo Clínico - CRP: ${professionalCrp}`, 105, y + 10, { align: 'center' });

    // Gold bottom border line
    doc.setDrawColor(45, 112, 112);
    doc.setLineWidth(1.5);
    doc.line(15, pageHeight - 12, 195, pageHeight - 12);
  };

  const handleGeneratePDF = () => {
    if (!selectedPatientId) {
      alert('Selecione um paciente para gerar o documento.');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      let y = getHeader(doc);

      const formattedDateStr = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      doc.setTextColor(30, 30, 30);

      if (docType === 'DECLARATION') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 80, 80);
        doc.text('DECLARAÇÃO DE COMPARECIMENTO', 105, y, { align: 'center' });
        y += 20;

        // Draw left vertical gold bar
        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + 42);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        
        const bodyText = `Declaro, para os devidos fins de comprovação, que o(a) paciente ${patient.name}, portador(a) do CPF nº ${patient.cpf || '_____________________'}, compareceu àsessão de atendimento psicoterapêutico no dia ${formattedDateStr}, no intervalo de horários das ${timeStart} às ${timeEnd}.\n\nEsta declaração refere-se estritamente à presença do(a) paciente no atendimento clínico, não implicando em atestado médico de qualquer natureza.`;

        const splitBody = doc.splitTextToSize(bodyText, 160);
        doc.text(splitBody, 25, y, { align: 'justify', lineHeightFactor: 1.6 });
        y += 55;

        doc.text(`Localidade de atendimento, ${new Date().toLocaleDateString('pt-BR')}.`, 25, y);

        getFooter(doc, pageHeight);
        doc.save(`declaracao_${patient.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      } 
      
      else if (docType === 'RECEIPT') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 80, 80);
        doc.text('RECIBO DE ATENDIMENTO CLÍNICO', 105, y, { align: 'center' });
        y += 20;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);

        // Draw left vertical gold bar
        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + 36);

        const valueFormatted = receiptValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const bodyText = `Recebi de ${patient.name}, portador(a) do CPF nº ${patient.cpf || '_____________________'}, a importância de R$ ${valueFormatted} (valor por extenso), referente ao pagamento de ${receiptDescription}, realizado no dia ${formattedDateStr}.\n\nDou por este o devido e pleno recebimento dos serviços prestados.`;

        const splitBody = doc.splitTextToSize(bodyText, 160);
        doc.text(splitBody, 25, y, { align: 'justify', lineHeightFactor: 1.6 });
        y += 45;

        doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}.`, 25, y);

        getFooter(doc, pageHeight);
        doc.save(`recibo_${patient.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      } 
      
      else if (docType === 'REPORT') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 80, 80);
        doc.text('RELATÓRIO PSICOLÓGICO', 105, y, { align: 'center' });
        y += 15;

        // 1. Identificação
        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + 16);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 80, 80);
        doc.text('1. IDENTIFICAÇÃO', 25, y);
        y += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9.5);
        doc.text(`Autor(a): ${professionalName} (CRP ${professionalCrp})`, 25, y); y += 5;
        doc.text(`Paciente/Solicitante: ${patient.name}`, 25, y); y += 5;
        doc.text(`Finalidade: Avaliação e Acompanhamento Psicológico Clínico`, 25, y); y += 12;

        // 2. Descriçãoo da Demanda
        const splitDemand = doc.splitTextToSize(reportDemand || 'Não informada.', 155);
        
        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + splitDemand.length * 5 + 4);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 80, 80);
        doc.text('2. DESCRIÇÃO DA DEMANDA', 25, y);
        y += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9.5);
        doc.text(splitDemand, 25, y, { align: 'justify', lineHeightFactor: 1.5 });
        y += splitDemand.length * 5 + 12;

        // Page break safety
        if (y > 200) { doc.addPage(); y = getHeader(doc) + 5; }

        // 3. Análise
        const splitAnalysis = doc.splitTextToSize(reportAnalysis || 'Não informada.', 155);

        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + splitAnalysis.length * 5 + 4);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 80, 80);
        doc.text('3. ANÁLISE', 25, y);
        y += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9.5);
        doc.text(splitAnalysis, 25, y, { align: 'justify', lineHeightFactor: 1.5 });
        y += splitAnalysis.length * 5 + 12;

        if (y > 220) { doc.addPage(); y = getHeader(doc) + 5; }

        // 4. Conclusão
        const splitConclusion = doc.splitTextToSize(reportConclusion || 'Não informada.', 155);

        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + splitConclusion.length * 5 + 10);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 80, 80);
        doc.text('4. CONCLUSÃO', 25, y);
        y += 5;

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9.5);
        doc.text(splitConclusion, 25, y, { align: 'justify', lineHeightFactor: 1.5 });
        y += splitConclusion.length * 5 + 10;

        doc.text(`Documento lavrado em ${new Date().toLocaleDateString('pt-BR')}.`, 25, y);

        getFooter(doc, pageHeight);
        doc.save(`relatorio_${patient.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      }

      else if (docType === 'REFERRAL') {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 80, 80);
        doc.text('ENCAMINHAMENTO PSICOLÓGICO', 105, y, { align: 'center' });
        y += 20;

        // Draw left vertical gold bar
        doc.setDrawColor(45, 112, 112);
        doc.setLineWidth(1);
        doc.line(20, y - 2, 20, y + 42);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);

        const bodyText = `Encaminho o(a) paciente ${patient.name}, portador(a) do CPF nº ${patient.cpf || '_____________________'}, para atendimento complementar junto à especialidade médica indicada.\n\nFinalidade/Justificativa:\n${referralText}\n\nPermaneço à disposição para maiores esclarecimentos e acompanhamento conjunto interprofissional.`;

        const splitBody = doc.splitTextToSize(bodyText, 160);
        doc.text(splitBody, 25, y, { align: 'justify', lineHeightFactor: 1.6 });
        y += splitBody.length * 6 + 15;

        doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}.`, 25, y);

        getFooter(doc, pageHeight);
        doc.save(`encaminhamento_${patient.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      }
    } catch (err) {
      console.error('Erro ao gerar documento PDF:', err);
    }
  };

  const getPreviewText = () => {
    const pName = selectedPatient ? selectedPatient.name : '[Nome do Paciente]';
    const pCpf = selectedPatient ? (selectedPatient.cpf || '_____________________') : '_____________________';
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (docType === 'DECLARATION') {
      return `Declaro, para os devidos fins de comprovação, que o(a) paciente ${pName}, portador(a) do CPF nº ${pCpf}, compareceu àsessão de atendimento psicoterapêutico no dia ${formattedDate}, no intervalo de horários das ${timeStart} às ${timeEnd}.\n\nEsta declaração refere-se estritamente à presença do(a) paciente no atendimento clínico, não implicando em atestado médico de qualquer natureza.`;
    }
    if (docType === 'RECEIPT') {
      const val = receiptValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      return `Recebi de ${pName}, portador(a) do CPF nº ${pCpf}, a importância supramencionada de R$ ${val}, referente ao pagamento de ${receiptDescription || 'sessão de psicoterapia individual'}, realizado no dia ${formattedDate}.\n\nDou por este o devido e pleno recebimento dos serviços prestados.`;
    }
    if (docType === 'REPORT') {
      return `1. IDENTIFICAÇÃO\nAutor: ${professionalName} (CRP ${professionalCrp})\nPaciente: ${pName}\n\n2. DESCRIÇÃO DA DEMANDA\n${reportDemand || '[Relate a demanda aqui...]'}\n\n3. ANÁLISE CLÍNICA\n${reportAnalysis || '[Descreva a análise aqui...]'}\n\n4. CONCLUSÃO\n${reportConclusion || '[Descreva a conclusão aqui...]'}`;
    }
    if (docType === 'REFERRAL') {
      return `Encaminho o(a) paciente ${pName}, portador(a) do CPF nº ${pCpf}, para atendimento complementar junto à especialidade médica indicada.\n\nFinalidade/Justificativa:\n${referralText || '[Insira o motivo do encaminhamento...]'}\n\nPermaneço à disposição para maiores esclarecimentos e acompanhamento conjunto interprofissional.`;
    }
    return '';
  };

  const docTemplates = [
    {
      id: 'DECLARATION' as DocType,
      title: 'Declaração',
      subtitle: 'Comparecimento',
      icon: Clock,
      activeColor: 'border-teal-500 bg-teal-500/5'
    },
    {
      id: 'RECEIPT' as DocType,
      title: 'Recibo',
      subtitle: 'Sessão Clínica',
      icon: DollarSign,
      activeColor: 'border-teal-500 bg-teal-500/5'
    },
    {
      id: 'REPORT' as DocType,
      title: 'Relatório',
      subtitle: 'Laudo Psicológico',
      icon: FileText,
      activeColor: 'border-teal-500 bg-teal-500/5'
    },
    {
      id: 'REFERRAL' as DocType,
      title: 'Encaminhamento',
      subtitle: 'Interprofissional',
      icon: Send,
      activeColor: 'border-teal-500 bg-teal-500/5'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left h-[calc(100vh-105px)] overflow-hidden p-0.5">
      
      {/* Configuration Form (Col 2) */}
      <div className="lg:col-span-2 flex flex-col h-full gap-4 overflow-hidden">
        
        {/* Document Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {docTemplates.map(t => {
            const Icon = t.icon;
            const isSelected = docType === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setDocType(t.id)}
                className={`border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 min-h-[105px] group bg-[#f0ede6]/20 dark:bg-[#112424] ${
                  isSelected ? t.activeColor : 'border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-400/40 dark:hover:border-teal-600/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border bg-white dark:bg-charcoal-950 ${
                    isSelected ? 'border-teal-500/30 text-teal-500' : 'border-[#e7e4dc] dark:border-charcoal-800 text-stone-400 group-hover:text-teal-500'
                  } transition-colors`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-500 dark:text-teal-400" />}
                </div>
                <div className="mt-3 text-left">
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${isSelected ? 'text-teal-600 dark:text-teal-300' : 'text-charcoal-900 dark:text-white'}`}>{t.title}</span>
                  <span className="text-[9px] text-stone-400 dark:text-white font-medium block mt-0.5">{t.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Details - Inner Scroll Container to prevent page scrolling */}
        <div className="flex-1 bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-5 shadow-lg overflow-y-auto space-y-4 scrollbar-thin">
          <form className="space-y-4 text-xs font-semibold text-stone-600 dark:text-charcoal-350" onSubmit={(e) => e.preventDefault()}>
            
            {/* Patient Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Paciente Destinatário</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-2 px-3.5 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                  required
                >
                  <option value="">-- Selecione o Paciente --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.cpf ? `(CPF: ${p.cpf})` : '(Sem CPF)'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Data do Documento</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-1.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold text-center"
                />
              </div>
            </div>

            {/* Template Specific Form Controls */}
            {docType === 'DECLARATION' && (
              <div className="grid grid-cols-2 gap-4 border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 pt-4 animate-fadeIn">
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Hora de Entrada</label>
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-1.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Hora de Saída</label>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-1.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold text-center"
                  />
                </div>
              </div>
            )}

            {docType === 'RECEIPT' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 pt-4 animate-fadeIn">
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Valor da Consulta (R$)</label>
                  <input
                    type="number"
                    value={receiptValue}
                    onChange={(e) => setReceiptValue(Number(e.target.value))}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-1.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                  />
                </div>
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Descriçãoo do Serviço</label>
                  <input
                    type="text"
                    value={receiptDescription}
                    onChange={(e) => setReceiptDescription(e.target.value)}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-1.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                  />
                </div>
              </div>
            )}

            {docType === 'REPORT' && (
              <div className="space-y-4 border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 pt-4 animate-fadeIn">
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">1. Demanda (Queixas e motivo da procura)</label>
                  <textarea
                    value={reportDemand}
                    onChange={(e) => setReportDemand(e.target.value)}
                    rows={3}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                    placeholder="Descriçãoo sucinta dos motivos da avaliação ou acompanhamento..."
                  />
                </div>
                
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">2. Análise (Evolução clínica e fundamentação)</label>
                  <textarea
                    value={reportAnalysis}
                    onChange={(e) => setReportAnalysis(e.target.value)}
                    rows={3}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                    placeholder="Análise fundamentada sobre as sessõees e a evolução terapêutica..."
                  />
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">3. Conclusão (Encaminhamentos e parecer)</label>
                  <textarea
                    value={reportConclusion}
                    onChange={(e) => setReportConclusion(e.target.value)}
                    rows={2}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                    placeholder="Conclusão diagnóstica ou orientaçõeses pós-atendimentos..."
                  />
                </div>
              </div>
            )}

            {docType === 'REFERRAL' && (
              <div className="space-y-4 border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 pt-4 animate-fadeIn">
                <div>
                  <label className="block uppercase tracking-wider mb-2 font-black text-[9px] text-stone-500 dark:text-white">Justificativa e Motivo do Encaminhamento</label>
                  <textarea
                    value={referralText}
                    onChange={(e) => setReferralText(e.target.value)}
                    rows={4}
                    className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/40 rounded-xl py-2 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                    placeholder="Escreva a finalidade técnica do encaminhamento ao profissional parceiro..."
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGeneratePDF}
                className="uiverse-btn-gold text-white px-5 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Gerar e Baixar Documento (.pdf)
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Real-time Document Sheet Preview (Col 1 - height fits container) */}
      <div className="lg:col-span-1 flex flex-col h-full gap-2 overflow-hidden items-stretch">
        <span className="text-[9px] text-stone-400 dark:text-white font-extrabold uppercase tracking-widest block shrink-0">Pré-Visualização Real-Time</span>
        
        {/* The realistic paper container */}
        <div className="flex-1 bg-white border border-[#e7e4dc] rounded-2xl shadow-xl p-5 flex flex-col justify-between text-[#1c1c22] relative overflow-hidden select-none font-serif text-[7.5px] leading-relaxed h-full">
          
          {/* Header */}
          <div className="text-left shrink-0">
            <div className="text-[7.5px] text-stone-500 font-sans font-normal tracking-wide text-center">
              {professionalName} - Psicólogo  |  CRP: {professionalCrp}  |  Contato: {professionalContact}
            </div>
            
            {/* Elegant dual horizontal separator */}
            <div className="w-full h-[0.8px] bg-teal-700/50 mt-1" />
            <div className="w-full h-[0.2px] bg-teal-700/25 mt-[0.5px]" />
          </div>

          {/* Body Document */}
          <div className="flex-1 flex flex-col justify-start pt-4 px-0.5 text-justify overflow-y-auto scrollbar-none">
            
            {/* Document Title */}
            <h4 className="text-[8.5px] font-black tracking-wide text-center uppercase font-sans mb-3 text-teal-900">
              {docType === 'DECLARATION' && 'Declaração de Comparecimento'}
              {docType === 'RECEIPT' && 'Recibo de Atendimento Clínico'}
              {docType === 'REPORT' && 'Relatório Psicológico'}
              {docType === 'REFERRAL' && 'Encaminhamento Psicológico'}
            </h4>



            {/* Text and vertical divider layout */}
            <div className="flex gap-2 flex-1 mt-1">
              <div className="w-[1.2px] bg-teal-700/40 rounded-full shrink-0" />
              <div className="whitespace-pre-line leading-relaxed text-justify px-0.5 flex-1">
                {getPreviewText()}
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="text-center flex flex-col items-center pt-2 mt-auto shrink-0">
            <div className="w-24 h-[0.3px] bg-stone-400 mb-1" />
            <span className="font-bold font-sans text-[7.5px] block">{professionalName}</span>
            <span className="text-[6.5px] text-stone-500 font-medium block font-sans">Psicólogo Clínico - CRP: {professionalCrp}</span>
            
            {/* Bottom page gold bar */}
            <div className="w-full h-[1.5px] bg-teal-700/50 mt-3" />
          </div>
        </div>
      </div>
    </div>
  );
};
