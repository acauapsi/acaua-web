import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Patient } from '../services/db';
import { User, ArrowRight } from 'lucide-react';

interface Column {
  id: string;
  title: string;
  color: string;
}

interface KanbanProps {
  onSelectPatient?: (patientId: number) => void;
}

export const Kanban: React.FC<KanbanProps> = ({ onSelectPatient }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [manuallyMoved, setManuallyMoved] = useState<Record<number, string>>({});

  const [draggedPatientId, setDraggedPatientId] = useState<number | null>(null);
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);

  const columns: Column[] = [
    { id: 'FILA_ESPERA', title: 'Fila de Espera', color: 'border-amber-500/20 text-amber-500' },
    { id: 'AVALIACAO_INICIAL', title: 'Avaliação Inicial', color: 'border-blue-500/20 text-blue-400' },
    { id: 'EM_TERAPIA', title: 'Em Terapia', color: 'border-emerald-500/20 text-emerald-400' },
    { id: 'PREPARACAO_ALTA', title: 'Preparação para Alta', color: 'border-teal-500/20 text-teal-400' },
    { id: 'ALTA', title: 'Alta', color: 'border-stone-500/20 text-stone-400' }
  ];

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async (currentManuallyMoved: Record<number, string> = manuallyMoved) => {
    try {
      const data = await dbService.query<Patient>('SELECT * FROM patients');
      const evolutions = await dbService.query<any>('SELECT * FROM evolutions');
      const patientsWithEvolutions = new Set(evolutions.map((e: any) => e.patient_id));

      const resolved = data.map(p => {
        // If they have been manually dragged/moved during this session, use that state
        if (currentManuallyMoved[p.id]) {
          return {
            ...p,
            status: currentManuallyMoved[p.id]
          };
        }

        // Otherwise, if they have not had a single evolution (atendimento), they are in FILA_ESPERA.
        // If they have evolutions, we use the status saved in the database (defaulting to FILA_ESPERA).
        const hasEvolutions = patientsWithEvolutions.has(p.id);
        const status = hasEvolutions ? (p.status || 'FILA_ESPERA') : 'FILA_ESPERA';

        return {
          ...p,
          status
        };
      });

      // Sort resolved patients by kanban_order ASC
      resolved.sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

      setPatients(resolved);
    } catch (err) {
      console.error('Erro ao carregar pacientes no Kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, patientId: number) => {
    e.dataTransfer.setData('text/plain', patientId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPatientId(patientId);
  };

  const handleDragEnd = () => {
    setDraggedPatientId(null);
    setDraggedOverColId(null);
  };


  const handleDrop = async (e: React.DragEvent, targetStatus: string, targetPatientId: number | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedPatientId(null);
    setDraggedOverColId(null);
    const patientIdStr = e.dataTransfer.getData('text/plain');
    if (!patientIdStr) return;

    const draggedId = Number(patientIdStr);
    
    // Get all patients in the target column (excluding the dragged one if it was already there)
    // and sort them by kanban_order
    let colPatients = patients
      .filter(p => p.status === targetStatus && p.id !== draggedId)
      .sort((a, b) => (a.kanban_order || 0) - (b.kanban_order || 0));

    // Find the dragged patient object
    const draggedPatient = patients.find(p => p.id === draggedId);
    if (!draggedPatient) return;
    
    // Update its status
    draggedPatient.status = targetStatus;

    // Insert the dragged patient at the correct position
    if (targetPatientId !== null) {
      const insertIdx= colPatients.findIndex(p => p.id === targetPatientId);
      if (insertIdx!== -1) {
        colPatients.splice(insertIdx, 0, draggedPatient);
      } else {
        colPatients.push(draggedPatient);
      }
    } else {
      colPatients.push(draggedPatient);
    }

    // Update kanban_order for all patients in this column
    const updates = colPatients.map((p, index) => {
      p.kanban_order = index;
      return p;
    });

    // Update local state optimistically
    setPatients(prev => {
      return prev.map(p => {
        const updated = updates.find(u => u.id === p.id);
        if (updated) return updated;
        if (p.id === draggedId) {
          return { ...p, status: targetStatus, kanban_order: updates.indexOf(draggedPatient) };
        }
        return p;
      });
    });

    const nextManuallyMoved = {
      ...manuallyMoved,
      [draggedId]: targetStatus
    };
    setManuallyMoved(nextManuallyMoved);

    try {
      // Update status and order for the dragged patient
      await dbService.execute(
        'UPDATE patients SET status = ?, kanban_order = ? WHERE id = ?',
        [targetStatus, draggedPatient.kanban_order, draggedId]
      );

      // Update order of all other patients in the column
      for (const p of updates) {
        if (p.id !== draggedId) {
          await dbService.execute(
            'UPDATE patients SET kanban_order = ? WHERE id = ?',
            [p.kanban_order, p.id]
          );
        }
      }
      await loadPatients(nextManuallyMoved);
    } catch (err) {
      console.error('Erro ao atualizar status/ordem do paciente:', err);
      loadPatients(manuallyMoved); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn h-full select-none">
      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 h-[calc(100vh-100px)]">
        {columns.map((col) => {
          const colPatients = patients.filter(p => p.status === col.id);
          const isOver = draggedOverColId === col.id;
          
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedOverColId !== col.id) {
                  setDraggedOverColId(col.id);
                }
              }}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x= e.clientX;
                const y = e.clientY;
                if (x< rect.left || x>= rect.right || y < rect.top || y >= rect.bottom) {
                  setDraggedOverColId(null);
                }
              }}
              onDrop={(e) => handleDrop(e, col.id, null)}
              className={`glass-panel-teal rounded-2xl p-4 min-h-[480px] flex flex-col gap-3.5 border min-w-[200px] h-full transition-all duration-200 ${
                isOver
                  ? 'border-teal-500 bg-teal-500/5 dark:bg-teal-500/10 shadow-[0_0_15px_rgba(77,150,150,0.15)] scale-[1.01]'
                  : 'border-[#e7e4dc] dark:border-teal-700/40'
              }`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b border-[#e7e4dc] dark:border-charcoal-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-800 dark:text-zinc-200">
                  {col.title}
                </span>
                <span className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-full text-[9px] font-black">
                  {colPatients.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
                {colPatients.length === 0 ? (
                  <div className="flex-1 border border-dashed border-[#e7e4dc] dark:border-charcoal-800/80 rounded-xl flex items-center justify-center p-4 text-center">
                    <span className="text-[10px] italic text-stone-400 dark:text-white font-semibold uppercase tracking-wider">
                      Sem pacientes
                    </span>
                  </div>
                ) : (
                  colPatients.map((p) => {
                    const isDraggingThis = draggedPatientId === p.id;
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          if (draggedPatientId !== null && draggedPatientId !== p.id) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onDrop={(e) => {
                          if (draggedPatientId !== null && draggedPatientId !== p.id) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDrop(e, col.id, p.id);
                          }
                        }}
                        onClick={() => onSelectPatient && onSelectPatient(p.id)}
                        className={`bg-[#ffffff] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 rounded-xl p-3.5 shadow-sm hover:shadow-md cursor-pointer group relative transition-all text-left ${
                          isDraggingThis ? 'opacity-30 border-dashed border-teal-500 scale-95' : 'hover:border-teal-500/25'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 pointer-events-none">
                          <div className="p-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-500 rounded-lg shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-charcoal-800 dark:text-white truncate font-sans tracking-wide">
                              {p.name}
                            </h4>
                            {p.phone && (
                              <p className="text-[10px] text-stone-500 dark:text-white font-sans mt-0.5 truncate">
                                {p.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Small drag/link visual handle */}
                        <div className="flex justify-between mt-2 pt-2 border-t border-[#f4f2ea] dark:border-charcoal-800/60 text-[9px] font-black text-teal-500 uppercase tracking-widest items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span>Ver Prontuário</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
