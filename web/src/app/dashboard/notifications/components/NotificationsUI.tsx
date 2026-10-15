"use client";

import * as React from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  Search, 
  Plus, 
  Loader2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Sparkles,
  User,
  Users,
  Megaphone
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  clearAllNotifications,
  createNotification 
} from "@/domains/messaging/actions/notifications.actions";
import { triggerNotificationAction } from "@/domains/auth/actions/send-notification";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Mail, Smartphone } from "lucide-react";

type Notification = {
  id: number;
  title: string;
  content: string;
  type: string; // 'info' | 'warning' | 'success' | 'error'
  category: string;
  userId: number | null;
  isRead: boolean;
  createdAt: Date;
};

type UserType = {
  id: number;
  nomPrenom: string | null;
  utilisateur: string;
  admin: boolean | null;
};

type NotificationsUIProps = {
  initialNotifications: Notification[];
  usersList: UserType[];
  currentUser: {
    id: number;
    nomPrenom: string | null;
    utilisateur: string;
    admin: boolean | null;
  };
  locale: string;
};

export default function NotificationsUI({
  initialNotifications,
  usersList,
  currentUser,
  locale
}: NotificationsUIProps) {
  const [notificationsList, setNotificationsList] = React.useState<Notification[]>(initialNotifications);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();
  const [showAdminForm, setShowAdminForm] = React.useState<boolean>(false);

  // Form states
  const [formTitle, setFormTitle] = React.useState("");
  const [formContent, setFormContent] = React.useState("");
  const [formType, setFormType] = React.useState("info");
  const [formCategory, setFormCategory] = React.useState("Général");
  const [formUserId, setFormUserId] = React.useState<string>("all"); // 'all' or user.id

  // Async Messaging states
  const [asyncType, setAsyncType] = React.useState<'sms' | 'email' | 'push'>('sms');
  const [asyncRecipient, setAsyncRecipient] = React.useState("");
  const [asyncMessage, setAsyncMessage] = React.useState("");
  const [isSendingAsync, setIsSendingAsync] = React.useState(false);

  const isUserAdmin = currentUser?.admin === true;

  const handleSendAsyncMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asyncRecipient.trim() || !asyncMessage.trim()) {
      toast.error(isRtl ? "الرجاء ملء جميع الحقول" : "Veuillez remplir tous les champs");
      return;
    }

    setIsSendingAsync(true);
    try {
      const result = await triggerNotificationAction({
        type: asyncType,
        recipient: asyncRecipient,
        message: asyncMessage,
      });

      if (result.success) {
        toast.success(isRtl ? "تمت إضافة الرسالة إلى طابور الإرسال" : "Message ajouté à la file d'attente");
        setAsyncRecipient("");
        setAsyncMessage("");
      } else {
        toast.error(result.error || (isRtl ? "فشل إرسال الرسالة" : "Échec de l'envoi"));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSendingAsync(false);
    }
  };

  // Filter and search
  const filteredNotifications = React.useMemo(() => {
    return notificationsList.filter((notif) => {
      // Tab filter
      if (activeTab === "unread" && notif.isRead) return false;
      if (activeTab === "academics" && notif.category.toLowerCase() !== "scolarité") return false;
      if (activeTab === "finance" && notif.category.toLowerCase() !== "finances") return false;
      if (activeTab === "system" && notif.category.toLowerCase() !== "système") return false;

      // Search filter
      if (searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase();
      return (
        notif.title.toLowerCase().includes(query) ||
        notif.content.toLowerCase().includes(query) ||
        notif.category.toLowerCase().includes(query)
      );
    });
  }, [notificationsList, activeTab, searchQuery]);

  const unreadCount = React.useMemo(() => {
    return notificationsList.filter((n) => !n.isRead).length;
  }, [notificationsList]);

  // Actions
  const handleMarkAsRead = async (id: number) => {
    // Optimistic update
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    const res = await markAsRead(id);
    if (!res.success) {
      toast.error(locale === "AR" ? "فشل تحديث حالة الإشعار" : "Échec de la mise à jour");
      // Revert
      setNotificationsList(initialNotifications);
    } else {
      toast.success(locale === "AR" ? "تم تحديد الإشعار كمقروء" : "Notification marquée comme lue");
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    startTransition(async () => {
      const prevList = [...notificationsList];
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));

      const res = await markAllAsRead();
      if (!res.success) {
        toast.error(locale === "AR" ? "فشل تنفيذ العملية" : "Échec de l'opération");
        setNotificationsList(prevList);
      } else {
        toast.success(locale === "AR" ? "تم تحديد الكل كمقروء" : "Toutes les notifications marquées comme lues");
      }
    });
  };

  const handleDelete = async (id: number) => {
    startTransition(async () => {
      const prevList = [...notificationsList];
      setNotificationsList((prev) => prev.filter((n) => n.id !== id));

      const res = await deleteNotification(id);
      if (!res.success) {
        toast.error(locale === "AR" ? "فشل حذف الإشعار" : "Échec de la suppression");
        setNotificationsList(prevList);
      } else {
        toast.success(locale === "AR" ? "تم حذف الإشعار بنجاح" : "Notification supprimée");
      }
    });
  };

  const handleClearAll = () => {
    if (notificationsList.length === 0) return;

    if (!confirm(locale === "AR" ? "هل أنت متأكد من حذف جميع الإشعارات؟" : "Voulez-vous vraiment supprimer toutes les notifications ?")) {
      return;
    }

    startTransition(async () => {
      const prevList = [...notificationsList];
      setNotificationsList([]);

      const res = await clearAllNotifications();
      if (!res.success) {
        toast.error(locale === "AR" ? "فشل مسح الإشعارات" : "Échec du nettoyage");
        setNotificationsList(prevList);
      } else {
        toast.success(locale === "AR" ? "تم مسح جميع الإشعارات" : "Toutes les notifications ont été supprimées");
      }
    });
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error(locale === "AR" ? "الرجاء ملء جميع الحقول المطلوبة" : "Veuillez remplir les champs obligatoires");
      return;
    }

    startTransition(async () => {
      const targetUserId = formUserId === "all" ? undefined : parseInt(formUserId);
      const res = await createNotification({
        title: formTitle,
        content: formContent,
        type: formType,
        category: formCategory,
        userId: targetUserId,
      });

      if (!res.success) {
        toast.error(res.error || (locale === "AR" ? "فشل إرسال الإشعار" : "Échec de l'envoi de la notification"));
      } else {
        toast.success(locale === "AR" ? "تم إرسال الإشعار بنجاح" : "Notification envoyée avec succès");
        // Clear form
        setFormTitle("");
        setFormContent("");
        setFormUserId("all");
        setShowAdminForm(false);
        // Refresh local list (would require database refetch, we simulate here or rely on routing reload. Since server action calls revalidatePath, reloading or refetching is recommended. Let's add the simulation locally)
        const mockNewNotif: Notification = {
          id: Date.now(), // Temp ID
          title: formTitle,
          content: formContent,
          type: formType,
          category: formCategory,
          userId: targetUserId || null,
          isRead: false,
          createdAt: new Date(),
        };
        setNotificationsList((prev) => [mockNewNotif, ...prev]);
      }
    });
  };

  // Helper icons and styles based on type
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "warning":
        return {
          icon: <AlertTriangle className="size-5" />,
          bg: "bg-amber-50 border-amber-100/50",
          text: "text-amber-700",
          iconBg: "bg-amber-100 text-amber-600",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="size-5" />,
          bg: "bg-emerald-50 border-emerald-100/50",
          text: "text-emerald-700",
          iconBg: "bg-emerald-100 text-emerald-600",
        };
      case "error":
        return {
          icon: <XCircle className="size-5" />,
          bg: "bg-rose-50 border-rose-100/50",
          text: "text-rose-700",
          iconBg: "bg-rose-100 text-rose-600",
        };
      default: // info
        return {
          icon: <Info className="size-5" />,
          bg: "bg-blue-50 border-blue-100/50",
          text: "text-blue-700",
          iconBg: "bg-blue-100 text-blue-600",
        };
    }
  };

  // Helper styles based on category
  const getCategoryBadgeStyle = (category: string) => {
    switch (category.toLowerCase()) {
      case "scolarité":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "finances":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "système":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "cantine":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-pink-50 text-pink-700 border-pink-100";
    }
  };

  // Time Formatter
  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (locale === "AR") {
      if (diffMins < 1) return "الآن";
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return "أمس";
      return date.toLocaleDateString("ar-SA", { day: "numeric", month: "long" });
    } else {
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return "Hier";
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    }
  };

  const isRtl = locale === "AR";

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700" dir={isRtl ? "rtl" : "ltr"}>
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <span className="p-3 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 shadow-sm inline-flex">
              <Bell className="size-8" />
            </span>
            {isRtl ? "مركز الإشعارات والمراسلات" : "Centre de Notifications & Messagerie"}
          </h1>
          <p className="text-slate-500 font-medium">
            {isRtl 
              ? `إدارة التنبيهات وإرسال رسائل SMS/البريد الإلكتروني المجدولة.` 
              : `Gérez les alertes et envoyez des SMS/E-mails programmés.`}
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3 self-end md:self-center">
          {isUserAdmin && (
            <button
              onClick={() => setShowAdminForm(!showAdminForm)}
              className={cn(
                "h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm flex items-center gap-3 transition-all",
                showAdminForm 
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-lg"
              )}
            >
              {showAdminForm ? (
                <>
                  {isRtl ? "إغلاق" : "Fermer"}
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  {isRtl ? "إرسال جديد" : "Nouvel envoi"}
                </>
              )}
            </button>
          )}

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isPending}
            className="h-12 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 font-black text-xs uppercase tracking-widest text-slate-700 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-emerald-600" />}
            {isRtl ? "تحديد الكل" : "Tout marquer"}
          </button>
        </div>
      </div>

      {/* Admin Creator Dialog/Form */}
      {showAdminForm && (
        <Tabs defaultValue="internal" className="w-full space-y-6 animate-in slide-in-from-top-6 duration-500">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 rounded-2xl p-1 h-14">
            <TabsTrigger value="internal" className="rounded-xl font-bold">
              {isRtl ? "إشعارات داخلية" : "Alertes Internes"}
            </TabsTrigger>
            <TabsTrigger value="external" className="rounded-xl font-bold">
              {isRtl ? "رسائل خارجية (SMS/Email)" : "Envois Externes"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal">
            <form 
              onSubmit={handleCreateNotification} 
              className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-indigo-50 pb-4">
                <Megaphone className="size-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900">
                  {isRtl ? "بث إشعار جديد للنظام" : "Créer et diffuser une notification"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-6 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    {isRtl ? "عنوان الإشعار *" : "Titre de l'alerte *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={isRtl ? "عنوان الإشعار..." : "Ex: Fermeture exceptionnelle..."}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-600/20 outline-none"
                  />
                </div>

                <div className="md:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    {isRtl ? "النوع" : "Importance / Type"}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-600/20 outline-none"
                  >
                    <option value="info">Info (Bleu)</option>
                    <option value="warning">Warning (Orange)</option>
                    <option value="success">Success (Vert)</option>
                    <option value="error">Error (Rouge)</option>
                  </select>
                </div>

                <div className="md:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    {isRtl ? "الفئة" : "Catégorie"}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-600/20 outline-none"
                  >
                    <option value="Général">Général</option>
                    <option value="Scolarité">Scolarité</option>
                    <option value="Finances">Finances</option>
                    <option value="Système">Système</option>
                    <option value="Cantine">Cantine</option>
                  </select>
                </div>

                <div className="md:col-span-6 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    {isRtl ? "المستهدف بالإشعار" : "Destinataire"}
                  </label>
                  <select
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-600/20 outline-none"
                  >
                    <option value="all">📢 Tous les utilisateurs (Broadcast)</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.nomPrenom || u.utilisateur} ({u.admin ? "Admin" : "User"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-12 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    {isRtl ? "محتوى الإشعار *" : "Contenu de la notification *"}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder={isRtl ? "اكتب تفاصيل الإشعار هنا..." : "Entrez les détails ici..."}
                    className="w-full bg-slate-50 border-none rounded-2xl p-5 font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-600/20 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminForm(false)}
                  className="h-12 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 font-bold text-xs uppercase tracking-widest text-slate-600 transition-all"
                >
                  {isRtl ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {isRtl ? "بث الإشعار" : "Diffuser maintenant"}
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="external">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
                <CardTitle className="text-2xl font-black">
                  {isRtl ? "إرسال رسائل غير متزامنة" : "Envoi de messages asynchrones"}
                </CardTitle>
                <CardDescription>
                  {isRtl 
                    ? "سيتم إرسال هذه الرسائل عبر طوابير المعالجة (Message Queuing) لضمان الوصول." 
                    : "Ces messages seront traités via des files d'attente pour garantir la livraison."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleSendAsyncMessage} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
                        {isRtl ? "نوع الرسالة" : "Type de message"}
                      </Label>
                      <Select value={asyncType} onValueChange={(v: any) => setAsyncType(v)}>
                        <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="sms" className="font-bold flex items-center gap-2">
                            <Smartphone className="size-4 inline mr-2" /> {isRtl ? "رسالة نصية (SMS)" : "SMS"}
                          </SelectItem>
                          <SelectItem value="email" className="font-bold">
                            <Mail className="size-4 inline mr-2" /> {isRtl ? "بريد إلكتروني" : "E-mail"}
                          </SelectItem>
                          <SelectItem value="push" className="font-bold">
                            <Bell className="size-4 inline mr-2" /> {isRtl ? "إشعار دفع (Push)" : "Push Notification"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
                        {isRtl ? "المستلم (رقم الهاتف أو الإيميل)" : "Destinataire (Tel ou Email)"}
                      </Label>
                      <UIInput 
                        value={asyncRecipient}
                        onChange={(e) => setAsyncRecipient(e.target.value)}
                        placeholder={asyncType === 'sms' ? '+221...' : 'user@example.com'}
                        className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">
                      {isRtl ? "نص الرسالة" : "Contenu du message"}
                    </Label>
                    <Textarea 
                      value={asyncMessage}
                      onChange={(e) => setAsyncMessage(e.target.value)}
                      placeholder={isRtl ? "اكتب رسالتك هنا..." : "Écrivez votre message ici..."}
                      className="min-h-[120px] rounded-2xl border-slate-100 bg-slate-50 font-bold p-5"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit"
                      disabled={isSendingAsync}
                      className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
                    >
                      {isSendingAsync ? <Loader2 className="animate-spin" size={18} /> : <Megaphone size={18} />}
                      {isRtl ? "إرسال الآن" : "Envoyer maintenant"}
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Main Container: Tabs and Search & List */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          {/* Animated Tabs list */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-2xl w-fit">
            {[
              { id: "all", label: isRtl ? "الكل" : "Tous" },
              { id: "unread", label: isRtl ? "غير المقروءة" : "Non lus" },
              { id: "academics", label: isRtl ? "الدراسة" : "Scolarité" },
              { id: "finance", label: isRtl ? "المالية" : "Finances" },
              { id: "system", label: isRtl ? "النظام" : "Système" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  activeTab === tab.id
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-80">
            <span className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRtl ? "right-4" : "left-4")}>
              <Search className="size-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? "البحث في الإشعارات..." : "Rechercher..."}
              className={cn(
                "w-full h-12 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-600/20 outline-none",
                isRtl ? "pr-11 pl-4" : "pl-11 pr-4"
              )}
            />
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 grid place-items-center text-slate-300 relative shadow-inner">
              <Bell className="size-10" />
              <Sparkles className="size-5 text-indigo-400/80 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h4 className="text-lg font-black text-slate-800">
                {isRtl ? "لا توجد إشعارات" : "Boîte vide"}
              </h4>
              <p className="text-slate-400 font-semibold text-sm">
                {searchQuery 
                  ? (isRtl ? "لم نعثر على أي نتائج مطابقة لبحثك." : "Aucun résultat ne correspond à votre recherche.")
                  : (isRtl ? "أنت مواكب لكل شيء! لا توجد إشعارات جديدة حالياً." : "Vous êtes à jour ! Aucune nouvelle notification pour le moment.")}
              </p>
            </div>
          </div>
        ) : (
          /* Notification Card items */
          <div className="space-y-4">
            {filteredNotifications.map((notif) => {
              const typeCfg = getTypeConfig(notif.type);
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "group relative rounded-[2rem] border p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 transition-all duration-300",
                    notif.isRead 
                      ? "bg-slate-50/50 hover:bg-slate-50 border-slate-100/80" 
                      : "bg-white border-indigo-100/80 shadow-[0_10px_30px_rgba(99,102,241,0.02)] hover:border-indigo-200"
                  )}
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Icon Container */}
                    <div className={cn("w-12 h-12 rounded-2xl grid place-items-center shrink-0 border border-transparent shadow-inner", typeCfg.iconBg)}>
                      {typeCfg.icon}
                    </div>

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getCategoryBadgeStyle(notif.category))}>
                          {notif.category}
                        </span>
                        
                        <h4 className={cn("text-base tracking-tight truncate min-w-0", notif.isRead ? "font-bold text-slate-700" : "font-black text-slate-900")}>
                          {notif.title}
                        </h4>

                        {!notif.isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                        )}
                      </div>

                      <p className={cn("text-sm leading-relaxed font-semibold", notif.isRead ? "text-slate-400" : "text-slate-600")}>
                        {notif.content}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        <span>{formatTime(notif.createdAt)}</span>
                        {notif.userId === null && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            📢 {isRtl ? "عام" : "Général"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Mark read, Delete) */}
                  <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        title={isRtl ? "تحديد كمقروء" : "Marquer comme lu"}
                        className="w-10 h-10 rounded-xl bg-white hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 text-slate-500 hover:text-indigo-600 shadow-sm flex items-center justify-center transition-colors"
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      title={isRtl ? "حذف الإشعار" : "Supprimer"}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-600 shadow-sm flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
