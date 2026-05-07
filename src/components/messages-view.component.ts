import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppStateService, Message } from '../services/app-state.service';

@Component({
    selector: 'app-messages-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-6 max-w-7xl mx-auto p-4 pb-12 overflow-x-hidden">
        <!-- Sleek Professional Header -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden mb-6">
          <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
          
          <div class="relative z-10 flex items-center gap-5">
             <div class="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm text-blue-600 shrink-0 relative">
                <i class="fa-solid fa-comments text-2xl"></i>
                @if (state.unreadMessagesCount() > 0) {
                    <div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                        <div class="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                    </div>
                }
             </div>
             <div>
                <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Messaggistica</h2>
                <p class="text-xs font-semibold text-slate-500 mt-1">Centro comunicazioni e notifiche</p>
             </div>
          </div>

          <div class="flex gap-4 items-center z-10 w-full md:w-auto justify-between md:justify-end">
             <div class="flex items-center gap-2">
                <div class="relative group hidden sm:block">
                    <input type="text" placeholder="Cerca..." 
                           class="w-32 lg:w-48 px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] group-focus-within:text-blue-500 transition-colors"></i>
                </div>

                <button (click)="openNewMessageForm()" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-2 text-sm shrink-0">
                    <i class="fa-solid fa-plus-circle"></i>
                    <span class="hidden sm:inline">Nuovo Messaggio</span>
                </button>
             </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button (click)="activeFilter.set('RECEIVED')" 
                    [class]="'px-6 py-2 rounded-lg font-bold text-sm transition-all ' + (activeFilter() === 'RECEIVED' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800')">
                <i class="fa-solid fa-inbox mr-2"></i> Ricevuti
                @if (activeFilter() === 'RECEIVED' && state.unreadMessagesCount() > 0) {
                    <span class="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{{ state.unreadMessagesCount() }}</span>
                }
            </button>
            <button (click)="activeFilter.set('SENT')" 
                    [class]="'px-6 py-2 rounded-lg font-bold text-sm transition-all ' + (activeFilter() === 'SENT' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800')">
                <i class="fa-solid fa-paper-plane-share mr-2"></i> Inviati
            </button>
        </div>

        <!-- New Message Form -->
        @if (showNewMessageForm) {
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-slate-800 flex items-center gap-2">
                        <i class="fa-solid fa-paper-plane text-blue-500"></i>
                        Componi Messaggio
                    </h3>
                    <button (click)="cancelNewMessage()" class="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <i class="fa-solid fa-times text-sm"></i>
                    </button>
                </div>

                <div class="space-y-5">
                    @if (state.isAdmin()) {
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Destinatario</label>
                            <div class="flex gap-4 bg-slate-50 p-1.5 rounded-lg w-fit border border-slate-200">
                                <label class="flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-md transition-colors"
                                       [class.bg-white]="newMessage.recipientType === 'ALL'" [class.shadow-sm]="newMessage.recipientType === 'ALL'">
                                    <input type="radio" name="recipientType" value="ALL" [(ngModel)]="newMessage.recipientType" class="hidden">
                                    <span class="text-sm font-bold" [class.text-blue-600]="newMessage.recipientType === 'ALL'" [class.text-slate-500]="newMessage.recipientType !== 'ALL'">Tutte le Aziende</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-md transition-colors"
                                       [class.bg-white]="newMessage.recipientType === 'SINGLE'" [class.shadow-sm]="newMessage.recipientType === 'SINGLE'">
                                    <input type="radio" name="recipientType" value="SINGLE" [(ngModel)]="newMessage.recipientType" class="hidden">
                                    <span class="text-sm font-bold" [class.text-blue-600]="newMessage.recipientType === 'SINGLE'" [class.text-slate-500]="newMessage.recipientType !== 'SINGLE'">Azienda Specifica</span>
                                </label>
                            </div>
                        </div>

                        @if (newMessage.recipientType === 'SINGLE') {
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Azienda</label>
                                    <select [(ngModel)]="newMessage.recipientId" (change)="newMessage.recipientUserId = ''"
                                            class="w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-700 font-medium rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                                        <option value="">-- Seleziona Azienda --</option>
                                        @for (client of state.clients(); track client.id) {
                                            <option [value]="client.id">{{ client.name }}</option>
                                        }
                                    </select>
                                </div>
                                @if (newMessage.recipientId) {
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Operatore (Opzionale)</label>
                                        <select [(ngModel)]="newMessage.recipientUserId" class="w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-700 font-medium rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                                            <option value="">-- Tutta l'Azienda --</option>
                                            @for (user of getUsersForClient(newMessage.recipientId); track user.id) {
                                                <option [value]="user.id">{{ user.name }}</option>
                                            }
                                        </select>
                                    </div>
                                }
                            </div>
                        }
                    } @else {
                        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                            <i class="fa-solid fa-shield-halved text-blue-600"></i>
                            <div>
                                <p class="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Destinatario</p>
                                <p class="font-bold text-slate-800 text-sm">Amministrazione / Supporto Tecnico</p>
                            </div>
                        </div>
                    }

                    <input type="text" [(ngModel)]="newMessage.subject" placeholder="Oggetto del messaggio" 
                           class="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-slate-800 font-bold rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    
                    <textarea [(ngModel)]="newMessage.content" rows="4" placeholder="Scrivi il tuo messaggio qui..." 
                              class="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"></textarea>

                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                        <div class="relative w-full sm:w-auto">
                            <input type="file" (change)="onFileSelected($event)" id="file-upload" class="hidden">
                            <label for="file-upload" class="cursor-pointer flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 bg-white rounded-lg hover:bg-slate-50 transition-colors font-bold text-sm shadow-sm">
                                <i class="fa-solid fa-paperclip text-slate-400"></i>
                                <span>{{ newMessage.attachmentName || 'Allega file' }}</span>
                            </label>
                        </div>

                        <div class="flex gap-2 w-full sm:w-auto">
                            <button (click)="cancelNewMessage()" class="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm border border-slate-200">Annulla</button>
                            <button (click)="sendNewMessage()" [disabled]="!canSendMessage()" [class.opacity-50]="!canSendMessage()" class="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
                                <i class="fa-solid fa-paper-plane"></i> Invia
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        }

        <!-- Messages List -->
        <div class="space-y-3">
            @if (messages().length === 0) {
                <div class="bg-white border border-slate-200 p-12 rounded-2xl text-center">
                    <i class="fa-solid fa-inbox text-3xl text-slate-300 mb-4 block"></i>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Nessun messaggio presente</p>
                </div>
            }

            @for (message of messages(); track message.id) {
                <div class="bg-white rounded-xl shadow-sm border transition-all duration-300" [class.border-blue-300]="!message.read" [class.border-slate-200]="message.read">
                    <div class="p-4 md:p-5 flex justify-between items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors" [class.bg-blue-50/30]="!message.read" (click)="toggleMessageExpanded(message.id)">
                        <div class="flex items-start gap-4 flex-1">
                            <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-user text-sm"></i></div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <h3 class="text-lg font-bold text-slate-800 truncate">{{ message.subject }}</h3>
                                    @if (!message.read) { <span class="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded uppercase">NUOVO</span> }
                                </div>
                                <div class="flex flex-wrap items-center gap-x-3 text-[11px] font-bold text-slate-500 uppercase">
                                    <span class="text-slate-700">{{ message.senderName }}</span>
                                    <span>{{ message.timestamp | date:'dd/MM HH:mm' }}</span>
                                    <span class="ml-auto inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{{ getClientName(message.recipientId) }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button (click)="confirmDeleteModal($event, message.id)" class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-xl transition-all"><i class="fa-solid fa-trash-can text-sm"></i></button>
                            <div class="w-10 h-10 flex items-center justify-center text-slate-400 rounded-xl" [class.bg-slate-100]="isMessageExpanded(message.id)"><i class="fa-solid text-sm transition-transform" [class.fa-chevron-down]="!isMessageExpanded(message.id)" [class.fa-chevron-up]="isMessageExpanded(message.id)"></i></div>
                        </div>
                    </div>

                    @if (isMessageExpanded(message.id)) {
                        <div class="border-t border-slate-100 bg-white rounded-b-xl p-6">
                            <div class="text-slate-700 whitespace-pre-wrap font-medium mb-6">{{ message.content }}</div>
                            @if (message.attachmentName) {
                                <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                                    <div class="flex items-center gap-4">
                                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm"><i class="fa-solid fa-file-arrow-down text-xl"></i></div>
                                        <div>
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Allegato</p>
                                            <p class="text-sm font-bold text-slate-700 truncate max-w-[200px]">{{ message.attachmentName }}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button (click)="previewAttachment(message)" class="px-5 py-3 bg-slate-900 text-white font-black text-[11px] uppercase rounded-xl hover:bg-black transition-all shadow-md"><i class="fa-solid fa-eye mr-2"></i> Anteprima</button>
                                        <button (click)="downloadDoc({url: getDownloadUrl(message), name: message.attachmentName!})" class="px-5 py-3 bg-blue-600 text-white font-black text-[11px] uppercase rounded-xl hover:bg-blue-700 transition-all shadow-md"><i class="fa-solid fa-download mr-2"></i> Scarica</button>
                                    </div>
                                </div>
                            }
                            <div class="h-px bg-slate-100 my-6"></div>
                            @if (message.replies.length > 0) {
                                <div class="space-y-3 mb-6">
                                    @for (reply of message.replies; track reply.id) {
                                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 ml-8 relative">
                                            <div class="text-[10px] font-bold text-slate-500 uppercase mb-2"><span>{{ reply.senderName }}</span> • {{ reply.timestamp | date:'dd/MM HH:mm' }}</div>
                                            <p class="text-sm font-medium text-slate-700">{{ reply.content }}</p>
                                        </div>
                                    }
                                </div>
                            }
                            @if (showReplyForm() === message.id) {
                                <div class="bg-white border border-blue-200 p-1 rounded-xl shadow-sm">
                                    <textarea [(ngModel)]="replyContent" rows="3" placeholder="Scrivi la tua risposta..." class="w-full px-4 py-3 bg-transparent text-sm text-slate-700 outline-none resize-none"></textarea>
                                    <div class="flex justify-end p-2 bg-slate-50 rounded-b-lg border-t border-slate-100">
                                        <button (click)="cancelReply()" class="px-4 py-1.5 text-slate-500 font-bold text-xs uppercase">Annulla</button>
                                        <button (click)="sendReply(message.id)" [disabled]="!replyContent.trim()" class="px-5 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-sm shadow-sm transition-all hover:bg-blue-700">Invia</button>
                                    </div>
                                </div>
                            } @else {
                                <button (click)="startReply(message.id)" class="px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm flex items-center gap-2 shadow-sm"><i class="fa-solid fa-reply text-slate-400"></i> Rispondi</button>
                            }
                        </div>
                    }
                </div>
            }
        </div>

        <!-- Deletion Modal -->
        @if (messageToDelete()) {
            <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
                    <div class="p-8 text-center text-slate-800">
                        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100"><i class="fa-solid fa-trash-can text-2xl"></i></div>
                        <h3 class="text-xl font-bold mb-2">Elimina Messaggio?</h3>
                        <p class="text-sm font-medium text-slate-500">L'azione è irreversibile.</p>
                    </div>
                    <div class="flex border-t border-slate-100">
                        <button (click)="messageToDelete.set(null)" class="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase">Annulla</button>
                        <button (click)="deleteMessage()" class="flex-1 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors border-l border-slate-100 uppercase">Elimina</button>
                    </div>
                </div>
            </div>
        }

        <!-- PREVIEW OVERLAY -->
        @if (previewDoc()) {
            <div class="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" (click)="previewDoc.set(null)"></div>
                <div class="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col h-[85vh]">
                    <div class="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-file-invoice text-blue-600 text-xl"></i>
                            <div>
                                <h4 class="font-bold text-slate-800 text-sm truncate max-w-[300px]">{{ previewDoc()?.name }}</h4>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Allegato Messaggio • HACCP PRO</p>
                            </div>
                        </div>
                        <button (click)="previewDoc.set(null)" class="w-8 h-8 rounded shrink-0 bg-white hover:bg-slate-100 text-slate-400 border border-slate-200 transition-all"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="flex-1 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
                        @if (isImage(previewDoc()?.url || '')) {
                            <img [src]="previewDoc()?.url" class="max-w-full max-h-full object-contain p-4 rounded shadow-lg">
                        } @else if (isPDF(previewDoc()?.url || '')) {
                            <iframe [src]="getSafeUrl(previewDoc()?.url || '')" class="w-full h-full border-none bg-white"></iframe>
                        } @else {
                            <div class="text-center p-12"><i class="fa-solid fa-file-circle-exclamation text-4xl text-slate-300 mb-4 block"></i><p class="text-sm font-medium text-slate-500">Anteprima non disponibile.</p><button (click)="downloadDoc(previewDoc()!)" class="mt-4 text-blue-600 font-bold hover:underline">Scarica</button></div>
                        }
                    </div>
                    <div class="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span class="text-emerald-600 font-bold uppercase tracking-widest"><i class="fa-solid fa-shield-check mr-2"></i>Anteprima Sicura</span>
                        <button (click)="downloadDoc(previewDoc()!)" class="text-blue-600 font-bold hover:underline cursor-pointer border-none bg-transparent">SCARICA ORIGINALE</button>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(10%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `]
})
export class MessagesViewComponent {
    state = inject(AppStateService);
    sanitizer = inject(DomSanitizer);

    previewDoc = signal<{url: string, name: string} | null>(null);
    messageToDelete = signal<string | null>(null);

    showNewMessageForm = false;
    newMessage = {
        recipientType: 'ALL' as 'ALL' | 'SINGLE',
        recipientId: '',
        recipientUserId: '',
        subject: '',
        content: '',
        attachmentUrl: '',
        attachmentName: '',
        fileData: ''
    };

    activeFilter = signal<'RECEIVED' | 'SENT'>('RECEIVED');
    expandedMessages = signal<Set<string>>(new Set());
    showReplyForm = signal<string | null>(null);
    replyContent = '';

    messages = computed(() => {
        const user = this.state.currentUser();
        if (!user) return [];
        const allMessages = this.state.getMessagesForCurrentUser();
        return this.activeFilter() === 'SENT' ? allMessages.filter(m => m.senderId === user.id) : allMessages.filter(m => m.senderId !== user.id);
    });

    openNewMessageForm() {
        this.showNewMessageForm = true;
        this.newMessage.recipientType = this.state.isAdmin() ? 'ALL' : 'SINGLE';
        this.newMessage.recipientId = this.state.isAdmin() ? '' : 'ADMIN_OFFICE';
    }

    canSendMessage(): boolean {
        return !!(this.newMessage.subject.trim() && this.newMessage.content.trim() && (this.newMessage.recipientType !== 'SINGLE' || this.newMessage.recipientId));
    }

    sendNewMessage() {
        if (!this.canSendMessage()) return;
        this.state.sendMessage(
            this.newMessage.subject,
            this.newMessage.content,
            this.newMessage.recipientType,
            this.newMessage.recipientId || undefined,
            this.newMessage.recipientUserId || undefined,
            this.newMessage.attachmentName ? { url: this.newMessage.fileData, name: this.newMessage.attachmentName } : undefined
        );
        this.cancelNewMessage();
    }

    cancelNewMessage() {
        this.showNewMessageForm = false;
        this.newMessage = { recipientType: 'ALL', recipientId: '', recipientUserId: '', subject: '', content: '', attachmentUrl: '', attachmentName: '', fileData: '' };
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                this.state.toastService.error('Allegato troppo grande', 'Il file supera il limite di 10MB.');
                return;
            }

            this.newMessage.attachmentName = file.name;
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.newMessage.attachmentUrl = e.target.result;
                this.newMessage.fileData = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    getDownloadUrl(message: Message): string {
        return message.fileData || message.attachmentUrl || '';
    }

    getSafeUrl(url: string) {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }

    previewAttachment(message: Message) {
        const url = message.fileData || message.attachmentUrl;
        if (url) {
            this.previewDoc.set({ url, name: message.attachmentName || 'allegato' });
        }
    }

    isImage(url?: string): boolean {
        if (!url) return false;
        return url.startsWith('data:image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => (url || '').toLowerCase().includes(ext));
    }

    isPDF(url?: string): boolean {
        if (!url) return false;
        return url.startsWith('data:application/pdf') || (url || '').toLowerCase().includes('.pdf');
    }

    downloadDoc(doc: {url: string, name: string}) {
        if (!doc.url) return;
        if (doc.url.startsWith('data:')) {
            const parts = doc.url.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const raw = window.atob(parts[1]);
            const uInt8Array = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
            const blob = new Blob([uInt8Array], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = doc.name;
            link.click();
            URL.revokeObjectURL(blobUrl);
        } else {
            const link = document.createElement('a');
            link.href = doc.url;
            link.download = doc.name;
            link.click();
        }
    }

    toggleMessageExpanded(messageId: string) {
        const isExpanded = this.expandedMessages().has(messageId);
        
        this.expandedMessages.update(set => {
            const newSet = new Set(set);
            if (isExpanded) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });

        // Eseguiamo la marcatura come letto fuori dall'update() per non bloccare il render
        if (!isExpanded) {
            const msg = this.state.messages().find(m => m.id === messageId);
            if (msg && msg.senderId !== this.state.currentUser()?.id && !msg.read) {
                this.state.markMessageAsRead(messageId);
            }
        }
    }

    isMessageExpanded(messageId: string): boolean {
        return this.expandedMessages().has(messageId);
    }

    startReply(messageId: string) {
        this.showReplyForm.set(messageId);
        this.replyContent = '';
    }

    cancelReply() {
        this.showReplyForm.set(null);
        this.replyContent = '';
    }

    sendReply(messageId: string) {
        if (!this.replyContent.trim()) return;
        this.state.replyToMessage(messageId, this.replyContent);
        this.cancelReply();
    }

    confirmDeleteModal(event: MouseEvent, messageId: string) {
        event.stopPropagation();
        this.messageToDelete.set(messageId);
    }

    deleteMessage() {
        if (this.messageToDelete()) {
            this.state.deleteMessage(this.messageToDelete()!);
            this.messageToDelete.set(null);
        }
    }

    getClientName(clientId?: string): string {
        if (!clientId) return '';
        if (clientId === 'ADMIN_OFFICE') return 'Amministrazione';
        return this.state.clients().find(c => c.id === clientId)?.name || 'Sconosciuto';
    }

    getUsersForClient(clientId: string) {
        return this.state.systemUsers().filter(u => u.clientId === clientId);
    }

    printMessage(message: Message) {
        const frameId = 'print-frame-message';
        let frame = document.getElementById(frameId) as HTMLIFrameElement;
        if (!frame) { frame = document.createElement('iframe'); frame.id = frameId; frame.style.display = 'none'; document.body.appendChild(frame); }
        const doc = frame.contentWindow?.document;
        if (!doc) return;
        doc.open();
        doc.write(`<html><head><title>${message.subject}</title><style>body { font-family: sans-serif; padding: 40px; } .meta { margin-bottom: 20px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; } .content { white-space: pre-wrap; }</style></head><body><h1>${message.subject}</h1><div class="meta"><strong>Da:</strong> ${message.senderName}<br><strong>Data:</strong> ${new Date(message.timestamp).toLocaleString()}<br><strong>A:</strong> ${this.getClientName(message.recipientId)}</div><div class="content">${message.content}</div></body></html>`);
        doc.close();
        setTimeout(() => frame.contentWindow?.print(), 500);
    }
}
