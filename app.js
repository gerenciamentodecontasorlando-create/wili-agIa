// Agenda FocoZen - Versão Antitravamento
// Design para TDAH com foco em simplicidade e estabilidade

class FocoZenApp {
    constructor() {
        this.init();
    }
    
    init() {
        // Configuração inicial
        this.data = this.loadData();
        this.currentView = 'today';
        this.editingNoteId = null;
        this.currentReport = null;
        
        // Inicialização segura
        this.setupSafeEventListeners();
        this.updateUI();
        this.setupServiceWorker();
        this.setupTheme();
        
        // Verificação periódica de saúde
        this.startHealthCheck();
        
        console.log('FocoZen iniciado com sucesso!');
    }
    
    // Carregar dados com fallback seguro
    loadData() {
        try {
            const saved = localStorage.getItem('focozendata');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    tasks: parsed.tasks || [],
                    notes: parsed.notes || [],
                    focus: parsed.focus || '',
                    dailyProgress: parsed.dailyProgress || 0,
                    settings: parsed.settings || { theme: 'light' }
                };
            }
        } catch (e) {
            console.warn('Erro ao carregar dados, usando padrão');
        }
        
        return {
            tasks: [],
            notes: [],
            focus: '',
            dailyProgress: 0,
            settings: { theme: 'light' }
        };
    }
    
    // Salvar dados com tratamento de erro
    saveData() {
        try {
            localStorage.setItem('focozendata', JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            this.showStatus('Erro ao salvar. Use Exportar PDF para backup.', 'error');
            return false;
        }
    }
    
    // Configurar listeners seguros
    setupSafeEventListeners() {
        const safeAddListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
            }
        };
        
        // Navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            safeAddListener(btn, 'click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Tema
        safeAddListener(document.getElementById('themeToggle'), 'click', () => this.toggleTheme());
        safeAddListener(document.getElementById('focusMode'), 'click', () => this.toggleFocusMode());
        
        // Tarefas
        safeAddListener(document.getElementById('addQuickTask'), 'click', () => this.showTaskForm());
        safeAddListener(document.getElementById('addTodayTask'), 'click', () => this.showTaskForm());
        safeAddListener(document.getElementById('saveTask'), 'click', () => this.saveTask());
        safeAddListener(document.getElementById('cancelTask'), 'click', () => this.hideTaskForm());
        safeAddListener(document.getElementById('taskInput'), 'keypress', (e) => {
            if (e.key === 'Enter') this.saveTask();
        });
        
        // Notas
        safeAddListener(document.getElementById('newNoteBtn'), 'click', () => this.newNote());
        safeAddListener(document.getElementById('saveNote'), 'click', () => this.saveNote());
        safeAddListener(document.getElementById('deleteNote'), 'click', () => this.deleteNote());
        safeAddListener(document.getElementById('noteContent'), 'input', (e) => {
            document.getElementById('charCount').textContent = 
                `${e.target.value.length}/500`;
        });
        
        // Foco
        safeAddListener(document.getElementById('editFocus'), 'click', () => this.editFocus());
        
        // PDF
        document.querySelectorAll('.btn-export').forEach(btn => {
            safeAddListener(btn, 'click', (e) => this.generateReportPreview(
                e.target.closest('.export-card').dataset.report
            ));
        });
        safeAddListener(document.getElementById('downloadPdf'), 'click', () => this.downloadPDF());
        safeAddListener(document.getElementById('refreshReport'), 'click', () => this.refreshReport());
        
        // Outros
        safeAddListener(document.getElementById('clearData'), 'click', () => this.clearData());
        safeAddListener(document.getElementById('helpBtn'), 'click', () => this.showHelp());
        
        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            safeAddListener(btn, 'click', (e) => this.filterTasks(e.target.dataset.filter));
        });
    }
    
    // Alternar entre views
    switchView(view) {
        if (!view || view === this.currentView) return;
        
        // Atualizar botões de navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Esconder todas as views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });
        
        // Mostrar view selecionada
        const targetView = document.getElementById(`view-${view}`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = view;
            
            // Atualizar conteúdo específico da view
            if (view === 'today') {
                this.updateTodayView();
            } else if (view === 'tasks') {
                this.updateTasksView();
            } else if (view === 'notes') {
                this.updateNotesView();
            } else if (view === 'export') {
                this.updateExportView();
            }
        }
    }
    
    // Atualizar UI completa
    updateUI() {
        this.updateTodayDate();
        this.updateTodayView();
        this.updateDailyProgress();
        this.updateMotivation();
    }
    
    updateTodayDate() {
        const today = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = today.toLocaleDateString('pt-BR', options);
        document.getElementById('today-date').textContent = 
            `Hoje, ${dateStr}`;
    }
    
    updateTodayView() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.data.tasks.filter(task => 
            task.date === today || (task.date && new Date(task.date) <= new Date())
        );
        
        const container = document.getElementById('todayTasksList');
        if (!container) return;
        
        if (todayTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma tarefa para hoje</p>
                    <p><small>Adicione uma tarefa clicando no botão abaixo</small></p>
                </div>
            `;
        } else {
            container.innerHTML = todayTasks.map(task => `
                <div class="task-item" data-id="${task.id}">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="task-title ${task.completed ? 'completed' : ''}">
                            ${this.escapeHtml(task.title)}
                        </div>
                        <div class="task-meta">
                            ${task.priority === 'urgent' ? '🚨 ' : ''}
                            ${task.priority === 'important' ? '⭐ ' : ''}
                            ${task.category || ''}
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Adicionar listeners para checkboxes
            container.querySelectorAll('.task-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const taskId = e.target.closest('.task-item').dataset.id;
                    this.toggleTaskCompletion(taskId);
                });
            });
        }
        
        // Atualizar foco principal
        document.getElementById('mainFocus').textContent = 
            this.data.focus || 'Nenhum foco definido';
    }
    
    updateTasksView() {
        const container = document.getElementById('allTasksList');
        if (!container) return;
        
        const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        let tasks = this.data.tasks;
        
        if (filter === 'pending') {
            tasks = tasks.filter(t => !t.completed);
        } else if (filter === 'completed') {
            tasks = tasks.filter(t => t.completed);
        }
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>${filter === 'all' ? 'Nenhuma tarefa' : 
                         filter === 'pending' ? 'Nenhuma tarefa pendente' : 
                         'Nenhuma tarefa concluída'}</p>
                </div>
            `;
        } else {
            container.innerHTML = tasks.map(task => `
                <div class="task-item" data-id="${task.id}">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-content">
                        <div class="task-title ${task.completed ? 'completed' : ''}">
                            ${this.escapeHtml(task.title)}
                            ${task.date === new Date().toISOString().split('T')[0] ? ' (hoje)' : ''}
                        </div>
                        <div class="task-meta">
                            ${task.priority === 'urgent' ? '🚨 Urgente' : ''}
                            ${task.priority === 'important' ? '⭐ Importante' : ''}
                            ${task.date ? `• ${this.formatDate(task.date)}` : ''}
                        </div>
                    </div>
                    <button class="icon-btn delete-task" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
            
            // Adicionar listeners
            container.querySelectorAll('.task-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const taskId = e.target.closest('.task-item').dataset.id;
                    this.toggleTaskCompletion(taskId);
                });
            });
            
            container.querySelectorAll('.delete-task').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const taskId = e.target.closest('.task-item').dataset.id;
                    this.deleteTask(taskId);
                });
            });
        }
    }
    
    updateNotesView() {
        const container = document.getElementById('notesList');
        if (!container) return;
        
        if (this.data.notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma nota ainda</p>
                    <p><small>Clique em "Nova" para começar</small></p>
                </div>
            `;
            document.getElementById('noteEditor').style.display = 'none';
        } else {
            container.innerHTML = this.data.notes.map(note => `
                <div class="note-card" data-id="${note.id}">
                    <h4>${this.escapeHtml(note.title)}</h4>
                    <div class="note-preview">${this.escapeHtml(note.content.substring(0, 100))}...</div>
                    <div class="note-date">${this.formatDate(note.date)}</div>
                </div>
            `).join('');
            
            // Mostrar editor se estiver editando
            if (this.editingNoteId) {
                document.getElementById('noteEditor').style.display = 'block';
            } else {
                document.getElementById('noteEditor').style.display = 'none';
            }
            
            // Adicionar listeners para notas
            container.querySelectorAll('.note-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.icon-btn')) {
                        const noteId = card.dataset.id;
                        this.editNote(noteId);
                    }
                });
            });
        }
    }
    
    updateExportView() {
        // Atualizar preview se houver relatório atual
        if (this.currentReport) {
            this.generateReportPreview(this.currentReport);
        }
    }
    
    // Gerenciamento de tarefas
    showTaskForm() {
        document.getElementById('taskForm').style.display = 'block';
        document.getElementById('taskInput').focus();
        this.switchView('tasks');
    }
    
    hideTaskForm() {
        document.getElementById('taskForm').style.display = 'none';
        document.getElementById('taskInput').value = '';
    }
    
    saveTask() {
        const input = document.getElementById('taskInput');
        const title = input.value.trim();
        
        if (!title) {
            this.showStatus('Digite uma tarefa primeiro', 'warning');
            input.focus();
            return;
        }
        
        const task = {
            id: Date.now().toString(),
            title: title,
            completed: false,
            date: document.getElementById('taskToday').checked ? 
                new Date().toISOString().split('T')[0] : null,
            priority: document.getElementById('taskPriority').value,
            createdAt: new Date().toISOString()
        };
        
        this.data.tasks.unshift(task);
        this.saveData();
        
        input.value = '';
        this.hideTaskForm();
        this.updateUI();
        this.showStatus('Tarefa adicionada!', 'success');
    }
    
    toggleTaskCompletion(taskId) {
        const task = this.data.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveData();
            
            // Atualizar progresso
            this.updateDailyProgress();
            
            this.showStatus(task.completed ? 'Concluído! 🎉' : 'Marcado como pendente');
        }
    }
    
    deleteTask(taskId) {
        if (confirm('Excluir esta tarefa?')) {
            this.data.tasks = this.data.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.updateTasksView();
            this.showStatus('Tarefa excluída', 'info');
        }
    }
    
    filterTasks(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.updateTasksView();
    }
    
    // Gerenciamento de notas
    newNote() {
        this.editingNoteId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('charCount').textContent = '0/500';
        document.getElementById('noteEditor').style.display = 'block';
        document.getElementById('noteTitle').focus();
    }
    
    editNote(noteId) {
        const note = this.data.notes.find(n => n.id === noteId);
        if (note) {
            this.editingNoteId = noteId;
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteContent').value = note.content;
            document.getElementById('charCount').textContent = 
                `${note.content.length}/500`;
            document.getElementById('noteEditor').style.display = 'block';
            document.getElementById('noteTitle').focus();
        }
    }
    
    saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        
        if (!title || !content) {
            this.showStatus('Título e conteúdo são obrigatórios', 'warning');
            return;
        }
        
        const note = {
            id: this.editingNoteId || Date.now().toString(),
            title: title,
            content: content,
            date: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString()
        };
        
        if (this.editingNoteId) {
            const index = this.data.notes.findIndex(n => n.id === this.editingNoteId);
            if (index !== -1) {
                this.data.notes[index] = note;
            }
        } else {
            this.data.notes.unshift(note);
        }
        
        this.saveData();
        this.updateNotesView();
        this.showStatus('Nota salva!', 'success');
        this.editingNoteId = null;
    }
    
    deleteNote() {
        if (!this.editingNoteId) return;
        
        if (confirm('Excluir esta nota?')) {
            this.data.notes = this.data.notes.filter(n => n.id !== this.editingNoteId);
            this.saveData();
            this.updateNotesView();
            this.showStatus('Nota excluída', 'info');
            this.editingNoteId = null;
        }
    }
    
    // Gerenciamento de foco
    editFocus() {
        const currentFocus = this.data.focus;
        const newFocus = prompt('Qual é seu foco principal hoje?', currentFocus);
        
        if (newFocus !== null) {
            this.data.focus = newFocus.trim();
            this.saveData();
            this.updateTodayView();
            this.showStatus('Foco atualizado!', 'success');
        }
    }
    
    // Progresso diário
    updateDailyProgress() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.data.tasks.filter(t => 
            t.date === today || (t.date && new Date(t.date) <= new Date())
        );
        
        if (todayTasks.length === 0) {
            this.data.dailyProgress = 0;
        } else {
            const completed = todayTasks.filter(t => t.completed).length;
            this.data.dailyProgress = Math.round((completed / todayTasks.length) * 100);
        }
        
        const progressBar = document.getElementById('dailyProgress');
        const progressText = document.getElementById('progressPercent');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${this.data.dailyProgress}%`;
            progressText.textContent = `${this.data.dailyProgress}%`;
        }
        
        this.saveData();
    }
    
    // Motivação
    updateMotivation() {
        const tips = [
            "Quebre tarefas grandes em pedaços pequenos!",
            "Comemore cada conquista, por menor que seja!",
            "Use o temporizador Pomodoro: 25min foco, 5min pausa",
            "Priorize apenas 3 tarefas principais por dia",
            "Anote tudo que vier na mente para liberar espaço mental",
            "Respire fundo antes de começar uma tarefa difícil",
            "Lembre-se: Progresso, não perfeição!",
            "Faça pausas regulares para recarregar",
            "Comece pela tarefa mais difícil do dia",
            "Visualize sua meta alcançada!"
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        document.getElementById('dailyTip').textContent = randomTip;
    }
    
    // Gerar PDF (versão simplificada e segura)
    generateReportPreview(type) {
        this.currentReport = type;
        const preview = document.getElementById('pdfPreview');
        
        let html = `
            <div class="report-preview">
                <h2>${this.getReportTitle(type)}</h2>
                <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
                <hr>
                ${this.getReportContent(type)}
            </div>
        `;
        
        preview.innerHTML = html;
        this.showStatus('Preview gerado. Pronto para download!', 'success');
    }
    
    getReportTitle(type) {
        const titles = {
            daily: 'Relatório Diário - FocoZen',
            weekly: 'Relatório Semanal - FocoZen',
            focus: 'Relatório de Foco - FocoZen'
        };
        return titles[type] || 'Relatório - FocoZen';
    }
    
    getReportContent(type) {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        
        let content = '';
        
        if (type === 'daily') {
            const todayTasks = this.data.tasks.filter(t => t.date === today);
            const completed = todayTasks.filter(t => t.completed).length;
            
            content = `
                <h3>📊 Progresso Hoje</h3>
                <p><strong>${completed}/${todayTasks.length}</strong> tarefas concluídas</p>
                <p><strong>Foco do dia:</strong> ${this.data.focus || 'Não definido'}</p>
                
                <h3>📝 Tarefas de Hoje</h3>
                ${todayTasks.length > 0 ? 
                    todayTasks.map(t => `
                        <p>${t.completed ? '✅' : '⭕'} ${t.title} 
                        ${t.priority === 'urgent' ? '🚨' : t.priority === 'important' ? '⭐' : ''}</p>
                    `).join('') : 
                    '<p>Nenhuma tarefa para hoje</p>'
                }
            `;
            
        } else if (type === 'weekly') {
            const weekTasks = this.data.tasks.filter(t => 
                t.date >= weekAgo && t.date <= today
            );
            const completed = weekTasks.filter(t => t.completed).length;
            
            content = `
                <h3>📈 Progresso Semanal</h3>
                <p><strong>${completed}/${weekTasks.length}</strong> tarefas concluídas</p>
                <p><strong>Taxa de conclusão:</strong> ${weekTasks.length > 0 ? 
                    Math.round((completed / weekTasks.length) * 100) : 0}%</p>
                
                <h3>📅 Atividade da Semana</h3>
                ${weekTasks.length > 0 ? 
                    weekTasks.slice(0, 10).map(t => `
                        <p>${t.completed ? '✅' : '⭕'} ${t.date} - ${t.title}</p>
                    `).join('') : 
                    '<p>Nenhuma atividade registrada</p>'
                }
            `;
            
        } else if (type === 'focus') {
            const importantTasks = this.data.tasks.filter(t => 
                t.priority === 'important' || t.priority === 'urgent'
            );
            
            content = `
                <h3>🎯 Foco e Prioridades</h3>
                <p><strong>Foco atual:</strong> ${this.data.focus || 'Não definido'}</p>
                
                <h3>⭐ Tarefas Importantes</h3>
                ${importantTasks.length > 0 ? 
                    importantTasks.map(t => `
                        <p>${t.completed ? '✅' : '⭕'} ${t.title} 
                        (${t.priority === 'urgent' ? 'Urgente' : 'Importante'})</p>
                    `).join('') : 
                    '<p>Nenhuma tarefa importante registrada</p>'
                }
                
                <h3>📓 Notas Recentes</h3>
                ${this.data.notes.length > 0 ? 
                    this.data.notes.slice(0, 5).map(n => `
                        <p><strong>${n.title}</strong><br>
                        <small>${n.content.substring(0, 100)}...</small></p>
                    `).join('') : 
                    '<p>Nenhuma nota registrada</p>'
                }
            `;
        }
        
        return content;
    }
    
    downloadPDF() {
        if (!this.currentReport) {
            this.showStatus('Gere um preview primeiro', 'warning');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Configurações
            doc.setFont('helvetica');
            doc.setFontSize(20);
            doc.setTextColor(67, 97, 238);
            doc.text(this.getReportTitle(this.currentReport), 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 30, { align: 'center' });
            
            // Conteúdo
            const content = this.getReportContent(this.currentReport);
            const lines = doc.splitTextToSize(
                content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '), 
                180
            );
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(lines, 15, 45);
            
            // Rodapé
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('FocoZen - Agenda para TDAH', 105, 285, { align: 'center' });
            
            // Download
            doc.save(`focozen_${this.currentReport}_${Date.now()}.pdf`);
            this.showStatus('PDF baixado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            this.showStatus('Erro ao gerar PDF. Tente novamente.', 'error');
        }
    }
    
    refreshReport() {
        if (this.currentReport) {
            this.generateReportPreview(this.currentReport);
        }
    }
    
    // Tema
    setupTheme() {
        const savedTheme = this.data.settings.theme || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.data.settings.theme = newTheme;
        this.saveData();
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    toggleFocusMode() {
        document.body.classList.toggle('focus-mode');
        const icon = document.querySelector('#focusMode i');
        if (icon) {
            icon.className = document.body.classList.contains('focus-mode') ? 
                'fas fa-eye-slash' : 'fas fa-eye';
        }
        this.showStatus(
            document.body.classList.contains('focus-mode') ? 
            'Modo foco ativado' : 'Modo foco desativado'
        );
    }
    
    // Service Worker
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(() => console.log('Service Worker registrado'))
                .catch(err => console.log('Service Worker não registrado:', err));
        }
    }
    
    // Utilitários
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusText');
        if (statusEl) {
            statusEl.textContent = message;
            
            // Reset após 3 segundos
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.textContent = 'Pronto para usar!';
                }
            }, 3000);
        }
    }
    
    clearData() {
        if (confirm('Tem certeza? Isso apagará todas as tarefas e notas.')) {
            this.data = {
                tasks: [],
                notes: [],
                focus: '',
                dailyProgress: 0,
                settings: this.data.settings
            };
            this.saveData();
            this.updateUI();
            this.showStatus('Dados limpos!', 'success');
        }
    }
    
    showHelp() {
        alert(`FocoZen - Ajuda Rápida

🎯 Foco Principal: Defina uma meta para o dia
✓ Tarefas: Clique para marcar como feito
📝 Notas: Clique para editar, botão direito para excluir
🎨 Tema: Botão lua/sol para alternar claro/escuro
👁️ Modo Foco: Minimiza distrações
📄 PDF: Gera relatórios para impressão/backup

Dica: Comece com apenas 3 tarefas por dia!`);
    }
    
    // Verificação de saúde da aplicação
    startHealthCheck() {
        setInterval(() => {
            this.checkAppHealth();
        }, 30000); // A cada 30 segundos
    }
    
    checkAppHealth() {
        try {
            // Verificar se os dados estão corrompidos
            JSON.stringify(this.data);
            
            // Verificar se elementos críticos existem
            const criticalElements = [
                'todayTasksList',
                'allTasksList',
                'notesList',
                'pdfPreview'
            ];
            
            let allOk = true;
            criticalElements.forEach(id => {
                if (!document.getElementById(id)) {
                    console.warn(`Elemento crítico não encontrado: ${id}`);
                    allOk = false;
                }
            });
            
            if (!allOk) {
                console.log('Recriando elementos críticos...');
                this.updateUI();
            }
            
        } catch (e) {
            console.error('Erro na verificação de saúde:', e);
            // Tentar recuperar
            this.data = this.loadData();
            this.updateUI();
        }
    }
}

// Inicialização segura
window.addEventListener('load', () => {
    try {
        window.app = new FocoZenApp();
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif;">
                <h1>😕 Ops, algo deu errado</h1>
                <p>Recarregue a página ou limpe os dados do site.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin: 10px;">
                    Recarregar
                </button>
                <button onclick="localStorage.clear(); location.reload()" style="padding: 10px 20px; margin: 10px;">
                    Limpar Dados
                </button>
            </div>
        `;
    }
});
