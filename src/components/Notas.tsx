import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import { ConfirmModal } from './ConfirmModal';
import { 
  Plus, Trash2, Edit3, BookOpen, Search, Download, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';

interface Note {
  id: number;
  title: string;
  content: string;
  updated_at: string;
}

export const Notas: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor values
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Confirm modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmState({ isOpen: true, title, message, onConfirm: () => { onConfirm(); setConfirmState(prev => ({ ...prev, isOpen: false })); }, type });
  };

  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await dbService.query<Note>('SELECT * FROM notes');
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        // Autoselect first note by default
        handleSelectNote(data[0]);
      }
    } catch (err) {
      console.error('Erro ao buscar notas:', err);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSaveStatus('idle');
  };

  const handleCreateNote = async () => {
    try {
      const newId = await dbService.execute(
        'INSERT INTO notes (title, content, updated_at) VALUES (?, ?, ?)',
        ['Nova Anotação', '', new Date().toISOString()]
      );

      const newNote: Note = {
        id: newId,
        title: 'Nova Anotação',
        content: '',
        updated_at: new Date().toISOString()
      };

      setNotes(prev => [newNote, ...prev]);
      handleSelectNote(newNote);
    } catch (err) {
      console.error('Erro ao criar nota:', err);
    }
  };

  // Auto-saves content/title when professional stops typing
  const triggerAutoSave = (updatedTitle: string, updatedContent: string) => {
    if (!selectedNote) return;
    setSaveStatus('saving');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      try {
        const timeNow = new Date().toISOString();
        await dbService.execute(
          'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
          [updatedTitle, updatedContent, timeNow, selectedNote.id]
        );
        
        // Update local list
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, title: updatedTitle, content: updatedContent, updated_at: timeNow } : n));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Erro no salvamento automático:', err);
        setSaveStatus('idle');
      }
    }, 800); // 800ms debounce
  };

  const handleDeleteNote = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      'Excluir Anotação',
      'Esta anotação será removida permanentemente e não poderá ser recuperada. Tem certeza?',
      async () => {
        try {
          await dbService.execute('DELETE FROM notes WHERE id = ?', [id]);
          setNotes(prev => prev.filter(n => n.id !== id));
          if (selectedNote?.id === id) {
            setSelectedNote(null);
            setTitle('');
            setContent('');
          }
        } catch (err) {
          console.error('Erro ao deletar nota:', err);
        }
      },
      'danger'
    );
  };

  const handleExportText = () => {
    if (!selectedNote) return;
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getWordCount = () => {
    if (!content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 text-left h-[calc(100vh-105px)] overflow-hidden p-0.5 animate-fadeIn">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type={confirmState.type}
      />
      
      {/* Left Column: Notes List Panel */}
      <div className="lg:col-span-1 bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-4 shadow-lg flex flex-col justify-between h-full overflow-hidden">
        <div className="flex flex-col h-full space-y-4 overflow-hidden">
          
          {/* Header Title + Action */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-5 w-5 text-teal-600 dark:text-teal-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-900 dark:text-white">Bloco de Notas</span>
            </div>
            <button
              onClick={handleCreateNote}
              className="p-1.5 uiverse-btn-gold rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-md shrink-0"
              title="Nova Anotação"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 rounded-xl py-2 pl-9 pr-4 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
              placeholder="Buscar nas anotações..."
            />
          </div>

          {/* Notes list items */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-stone-400 dark:text-white font-sans text-xs">
                Nenhuma nota encontrada.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                const snippet = note.content.slice(0, 50) + (note.content.length > 50 ? '...' : '');
                const friendlyDate = new Date(note.updated_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all relative group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-gradient border-teal-500 text-charcoal-950 shadow-md scale-[1.01]'
                        : 'bg-[#faf9f6]/25 dark:bg-[#112424] border-[#e7e4dc] dark:border-charcoal-800/65 hover:border-teal-500/20 text-stone-600 dark:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${isSelected ? 'text-white' : 'text-charcoal-900 dark:text-white'}`}>
                        {note.title || 'Sem título'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all shrink-0 ${
                          isSelected 
                            ? 'text-charcoal-950 hover:bg-black/10' 
                            : 'text-stone-400 hover:text-red-500 hover:bg-red-500/5'
                        }`}
                        title="Excluir Nota"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <p className={`text-[9px] font-medium leading-relaxed font-sans normal-case mt-1 truncate ${isSelected ? 'text-white/80' : 'text-stone-500 dark:text-white'}`}>
                      {snippet || 'Nenhum texto ainda.'}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5">
                      <span className={`text-[8px] font-mono ${isSelected ? 'text-white/60' : 'text-stone-400 dark:text-white'}`}>
                        {friendlyDate}
                      </span>
                      <ChevronRight className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-stone-300 dark:text-charcoal-700'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Right Column: Editor Panel */}
      <div className="lg:col-span-3 bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-5 shadow-lg flex flex-col justify-between h-full overflow-hidden">
        {selectedNote ? (
          <div className="flex flex-col h-full space-y-4 overflow-hidden">
            
            {/* Editor Toolbar Header */}
            <div className="flex items-center justify-between shrink-0 border-b border-[#e7e4dc] dark:border-charcoal-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-900 dark:text-white">Editar Anotação</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Save status message indicator */}
                {saveStatus === 'saving' && (
                  <span className="text-[8px] font-bold text-stone-400 dark:text-white normal-case animate-pulse">Salvando automaticamente...</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 normal-case flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Salvo!
                  </span>
                )}

                <button
                  onClick={handleExportText}
                  className="flex items-center gap-1.5 bg-[#f0ede6] hover:bg-[#faf9f6] dark:bg-charcoal-900 dark:hover:bg-charcoal-800 text-charcoal-900 dark:text-white text-[9px] font-extrabold uppercase tracking-wider px-3 py-2 rounded-xl border border-[#e7e4dc] dark:border-teal-800/60 shadow-sm transition-all"
                  title="Exportar como TXT"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </button>
              </div>
            </div>

            {/* Note Title Input */}
            <div className="shrink-0 space-y-1 text-xs font-bold text-stone-500 dark:text-white uppercase tracking-wider">
              <label className="block text-[9px] font-black">Título do Bloco de Notas</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  triggerAutoSave(e.target.value, content);
                }}
                className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-teal-500/30 rounded-xl py-2 px-3.5 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                placeholder="Ex: Lembretes Rápidos"
              />
            </div>

            {/* Note Content Textarea Editor */}
            <div className="flex-1 flex flex-col space-y-1 text-xs font-bold text-stone-500 dark:text-charcoal-455 uppercase tracking-wider overflow-hidden">
              <label className="block text-[9px] font-black">Conteúdo do Bloco</label>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  triggerAutoSave(title, e.target.value);
                }}
                className="flex-1 w-full bg-[#f0ede6]/50 dark:bg-charcoal-900/50 border border-[#e7e4dc] dark:border-charcoal-800 rounded-2xl p-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium resize-none overflow-y-auto leading-relaxed normal-case"
                placeholder="Escreva livremente aqui o que desejar..."
              />
            </div>

            {/* Editor Footer / Info stats */}
            <div className="shrink-0 flex items-center justify-between border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 pt-3 text-[9px] font-mono text-stone-400 dark:text-white uppercase">
              <div className="flex items-center gap-3">
                <span>Caracteres: <strong className="text-stone-500 dark:text-white">{content.length}</strong></span>
                <span>Palavras: <strong className="text-stone-500 dark:text-white">{getWordCount()}</strong></span>
              </div>
              <span className="normal-case">Bloco de Notas Clínico - Criptografado localmente</span>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3.5 select-none animate-fadeIn">
            <div className="p-4 bg-teal-500/10 border border-teal-500/25 text-teal-400 rounded-3xl shadow-inner">
              <FileText className="h-8 w-8 text-teal-500" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-xs font-black uppercase tracking-widest text-charcoal-900 dark:text-white">Nenhum Bloco Selecionado</h4>
              <p className="text-[10px] text-stone-500 dark:text-white font-sans leading-normal">Selecione uma anotação na barra lateral ou clique no botão "+" para criar um novo bloco de notas.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
