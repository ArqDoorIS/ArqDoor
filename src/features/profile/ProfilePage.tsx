// src/pages/Profile.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AplicationLayout from "@/components/layouts/ApplicationLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCEP, formatCpf, formatCnpj, validateCpf, validateCnpj } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Edit2,
  Trash2,
  Mail,
  Save,
  X,
  User,
  Plus,
  Image as ImageIcon,
  Star,
} from "lucide-react";
import PortfolioModal from "@/components/modals/PortfolioModal";
import { API_BASE_URL } from "@/lib/queryClient";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfessionCard } from "./components/ProfessionCard";
import { DocumentsCard } from "./components/DocumentsCard";
import { AboutCard } from "./components/AboutCard";
import { ServicesSection } from "./components/ServicesSection";
import { RatingsModal } from "./components/RatingsModal";
import { ReceivingAccountsCard } from "./components/ReceivingAccountsCard";
import { TrustCard } from "./components/TrustCard";
import type { ProviderReceivingAccountApi } from "./types";
import type { ReceivingAccountDraft } from "./components/ReceivingAccountsCard";

export default function ProfilePage() {
  const { user, logout, updateUserLocal } = useAuth();
  const { toast } = useToast();
  const buildImageUrl = (path?: string) => {
    if (!path) return "";
    const normalizedPath = path.replace(/\\/g, "/");
    return normalizedPath.startsWith("http")
      ? normalizedPath
      : `${API_BASE_URL}/${normalizedPath.replace(/^\/+/, "")}`;
  };

  const onlyDigits = (v: string) => (v || '').toString().replace(/\D/g, '');
  const priceFromDigits = (v: string) => {
    const d = onlyDigits(v);
    return d ? parseInt(d, 10) / 100 : 0;
  };

  const [services, setServices] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", description: "", price: "" });
  const [creatingItem, setCreatingItem] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<any>({});

  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newPortfolioTitle, setNewPortfolioTitle] = useState("");
  const [newPortfolioDescription, setNewPortfolioDescription] = useState("");
  const [newPortfolioFile, setNewPortfolioFile] = useState<File | null>(null);
  const [newPortfolioPreview, setNewPortfolioPreview] = useState<string | null>(null);
  const [newPortfolioImageId, setNewPortfolioImageId] = useState<number | null>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any | null>(null);
  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);
  const [ratingsPreview, setRatingsPreview] = useState<{ average: number; count: number; latest: any[] }>({
    average: 0,
    count: 0,
    latest: [],
  });

  // about me
  const [about, setAbout] = useState<string>("");
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [providerProfile, setProviderProfile] = useState<any | null>(null);
  const [loadingProviderInfo, setLoadingProviderInfo] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [receivingAccounts, setReceivingAccounts] = useState<
    ProviderReceivingAccountApi[]
  >([]);
  const [loadingReceivingAccounts, setLoadingReceivingAccounts] = useState(false);

  const [profession, setProfession] = useState<string>("");
  const [isEditingProfession, setIsEditingProfession] = useState(false);
  const [savingProfession, setSavingProfession] = useState(false);

  const [documentsData, setDocumentsData] = useState({ cpf: "", cnpj: "" });
  const [documentsOriginal, setDocumentsOriginal] = useState({ cpf: "", cnpj: "" });
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [savingDocuments, setSavingDocuments] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState("");
  const [signaturePasswordConfirm, setSignaturePasswordConfirm] = useState("");
  const [savingSignaturePassword, setSavingSignaturePassword] = useState(false);

  const [ratingsModalOpen, setRatingsModalOpen] = useState(false);
  const [ratingsModalLoading, setRatingsModalLoading] = useState(false);
  const [ratingsModalData, setRatingsModalData] = useState<{ average: number; count: number; list: any[] } | null>(null);

  const [locationInfo, setLocationInfo] = useState<any | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);


  // === função para salvar/editar o "Sobre mim" ===
  const handleSaveAbout = async () => {
    if (!user) return;
    if (user.type !== "prestador") {
      toast({
        title: "Recurso indisponível",
        description: "A seção 'Sobre mim' está disponível apenas para prestadores.",
        variant: "destructive",
      });
      return;
    }
    if (!providerProfile) {
      toast({
        title: "Prestador não encontrado",
        description: "Não foi possível carregar seus dados. Atualize a página.",
        variant: "destructive",
      });
      return;
    }
    setSavingAbout(true);
    try {
      const payload = { about };
      const endpoint = `/providers/${providerProfile.provider_id}`;

      const res = await apiRequest("PUT", endpoint, payload);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || `Erro ao salvar: ${res.status}`);
      }

      setProviderProfile((prev: any) =>
        prev ? { ...prev, about } : prev
      );
      toast({ title: "Sucesso", description: "Sobre mim atualizado!" });
      setIsEditingAbout(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingAbout(false);
    }
  };

  const loadProviderInfo = useCallback(async () => {
    if (!user || user.type !== "prestador") {
      setProviderProfile(null);
      setAbout("");
      return;
    }
    try {
      setLoadingProviderInfo(true);
      setProviderError(null);
      const res = await apiRequest("GET", `/providers/user/${user.id}`);
      if (!res.ok) {
        throw new Error("Não foi possível carregar os dados do prestador");
      }
      const body = await res.json();
      setProviderProfile(body.provider);
      setAbout(body.provider?.about || "");
      setProfession(body.provider?.profession || "");
    } catch (error: any) {
      setProviderError(error?.message || "Falha ao carregar dados do prestador");
      setProviderProfile(null);
      setAbout("");
      setProfession("");
    } finally {
      setLoadingProviderInfo(false);
    }
  }, [user]);

  useEffect(() => {
    loadProviderInfo();
  }, [loadProviderInfo]);

  const loadReceivingAccounts = useCallback(async () => {
    if (user?.type !== "prestador" || !providerProfile?.provider_id) {
      setReceivingAccounts([]);
      return;
    }

    try {
      setLoadingReceivingAccounts(true);
      const res = await apiRequest(
        "GET",
        `/providers/${providerProfile.provider_id}/accounts`
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Erro ao carregar carteira.");
      }
      setReceivingAccounts(Array.isArray(body.accounts) ? body.accounts : []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar carteira",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setReceivingAccounts([]);
    } finally {
      setLoadingReceivingAccounts(false);
    }
  }, [providerProfile?.provider_id, toast, user?.type]);

  useEffect(() => {
    loadReceivingAccounts();
  }, [loadReceivingAccounts]);

  const saveReceivingAccount = useCallback(
    async (draft: ReceivingAccountDraft, accountId?: number) => {
      if (!providerProfile?.provider_id) return false;
      try {
        const endpoint = accountId
          ? `/providers/${providerProfile.provider_id}/accounts/${accountId}`
          : `/providers/${providerProfile.provider_id}/accounts`;
        const method = accountId ? "PUT" : "POST";
        const payload = {
          ...draft,
          nickname: draft.nickname.trim(),
          bank_code: draft.bank_code.trim(),
          bank_name: draft.bank_name.trim(),
          bank_agency: draft.bank_agency.trim(),
          bank_account: draft.bank_account.trim(),
          bank_document: draft.bank_document.replace(/\D/g, ""),
          pix_key: draft.pix_key.trim(),
        };
        const res = await apiRequest(method, endpoint, payload);
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.success === false) {
          throw new Error(body?.message || "Erro ao salvar conta.");
        }
        toast({
          title: accountId ? "Conta atualizada" : "Conta cadastrada",
          description: "A carteira de recebimento foi atualizada com sucesso.",
        });
        await loadReceivingAccounts();
        return true;
      } catch (error: any) {
        toast({
          title: "Erro ao salvar conta",
          description: error?.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return false;
      }
    },
    [loadReceivingAccounts, providerProfile?.provider_id, toast]
  );

  const handleCreateReceivingAccount = useCallback(
    async (draft: ReceivingAccountDraft) => saveReceivingAccount(draft),
    [saveReceivingAccount]
  );

  const handleUpdateReceivingAccount = useCallback(
    async (accountId: number, draft: ReceivingAccountDraft) =>
      saveReceivingAccount(draft, accountId),
    [saveReceivingAccount]
  );

  const handleDeleteReceivingAccount = useCallback(
    async (accountId: number) => {
      if (!providerProfile?.provider_id) return false;
      try {
        const res = await apiRequest(
          "DELETE",
          `/providers/${providerProfile.provider_id}/accounts/${accountId}`
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.success === false) {
          throw new Error(body?.message || "Erro ao remover conta.");
        }
        toast({
          title: "Conta removida",
          description: "A conta saiu da carteira de recebimento.",
        });
        await loadReceivingAccounts();
        return true;
      } catch (error: any) {
        toast({
          title: "Erro ao remover conta",
          description: error?.message || "Tente novamente mais tarde.",
          variant: "destructive",
        });
        return false;
      }
    },
    [loadReceivingAccounts, providerProfile?.provider_id, toast]
  );

  const loadLocationInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingLocation(true);
      const res = await apiRequest("GET", `/locationuser?user_id=${user.id}`);
      if (!res.ok) {
        setLocationInfo(null);
        return;
      }
      const body = await res.json().catch(() => ({}));
      const list = body?.locations || [];
      if (!Array.isArray(list) || list.length === 0) {
        setLocationInfo(null);
        return;
      }
      const sorted = [...list].sort((a, b) => {
        const aDate = new Date(a?.created_at || a?.createdAt || 0).getTime();
        const bDate = new Date(b?.created_at || b?.createdAt || 0).getTime();
        return bDate - aDate;
      });
      setLocationInfo(sorted[0]);
    } catch (error) {
      console.error(error);
      setLocationInfo(null);
    } finally {
      setLoadingLocation(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLocationInfo();
  }, [loadLocationInfo]);

  useEffect(() => {
    if (!newPortfolioFile) {
      if (!newPortfolioImageId) {
        setNewPortfolioPreview(null);
      }
      return;
    }
    const url = URL.createObjectURL(newPortfolioFile);
    setNewPortfolioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newPortfolioFile, newPortfolioImageId]);

  useEffect(() => {
    if (!isUploadingImage) {
      setNewPortfolioFile(null);
      setNewPortfolioTitle("");
      setNewPortfolioDescription("");
      setNewPortfolioImageId(null);
      setEditingPortfolioId(null);
    }
  }, [isUploadingImage]);

  useEffect(() => {
    if (!isUploadingImage) {
      setNewPortfolioFile(null);
      setNewPortfolioTitle("");
      setNewPortfolioDescription("");
    }
  }, [isUploadingImage]);

  const loadDocumentsData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingDocuments(true);
    try {
      const res = await apiRequest("GET", `/users/${user.id}`);
      if (!res.ok) return;
      const body = await res.json();
      const next = {
        cpf: formatCpf(body?.user?.cpf || ""),
        cnpj: formatCnpj(body?.user?.cnpj || ""),
      };
      setDocumentsData(next);
      setDocumentsOriginal(next);

      if (body?.user) {
        if (body.user.perfil !== user.perfil || body.user.banner !== user.banner) {
          updateUserLocal({
            perfil: body.user.perfil,
            banner: body.user.banner,
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [user?.id, user?.perfil, user?.banner, updateUserLocal]);

  useEffect(() => {
    loadDocumentsData();
  }, [loadDocumentsData]);

  const documentsChanged =
    documentsData.cpf !== documentsOriginal.cpf ||
    documentsData.cnpj !== documentsOriginal.cnpj;

  const handleSaveProfession = async () => {
    if (!user || user.type !== "prestador" || !providerProfile) return;
    if (!profession.trim()) {
      toast({
        title: "Profissão obrigatória",
        description: "Informe sua profissão.",
        variant: "destructive",
      });
      return;
    }
    setSavingProfession(true);
    try {
      const payload = { profession: profession.trim() };
      const endpoint = `/providers/${providerProfile.provider_id}`;
      const res = await apiRequest("PUT", endpoint, payload);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível atualizar a profissão");
      }
      setProviderProfile((prev: any) =>
        prev ? { ...prev, profession: profession.trim() } : prev
      );
      toast({ title: "Profissão atualizada" });
      setIsEditingProfession(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao salvar a profissão",
        variant: "destructive",
      });
    } finally {
      setSavingProfession(false);
    }
  };

  const handleSaveDocuments = async () => {
    if (!user) return;

    if (documentsData.cpf && !validateCpf(documentsData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "O CPF informado não é válido. Verifique os dígitos.",
        variant: "destructive",
      });
      return;
    }

    if (documentsData.cnpj && !validateCnpj(documentsData.cnpj)) {
      toast({
        title: "CNPJ inválido",
        description: "O CNPJ informado não é válido. Verifique os dígitos.",
        variant: "destructive",
      });
      return;
    }

    setSavingDocuments(true);
    try {
      const payload: Record<string, string | null> = {
        cpf: onlyDigits(documentsData.cpf) || null,
        cnpj: onlyDigits(documentsData.cnpj) || null,
      };

      const res = await apiRequest("PUT", `/users/${user.id}`, payload);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível atualizar os documentos");
      }

      setDocumentsOriginal({ ...documentsData });
      toast({
        title: "Dados atualizados",
        description: "Seu CPF/CNPJ será usado apenas para pagamentos internos",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar os documentos",
        variant: "destructive",
      });
    } finally {
      setSavingDocuments(false);
    }
  };

  const handleCancelDocuments = () => {
    setDocumentsData(documentsOriginal);
  };

  const handleSaveSignaturePassword = async () => {
    if (!user) return;
    const trimmedPassword = signaturePassword.trim();
    const trimmedConfirm = signaturePasswordConfirm.trim();
    if (!trimmedPassword) {
      toast({
        title: "Senha obrigatória",
        description: "Informe a senha de assinatura.",
        variant: "destructive",
      });
      return;
    }
    if (trimmedPassword.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter ao menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    // O backend recusa acima de 50; sem isto a tela deixava digitar e so o servidor
    // reclamava, depois de o usuario ja ter preenchido as duas vezes.
    if (trimmedPassword.length > 50) {
      toast({
        title: "Senha inválida",
        description: "A senha pode ter no máximo 50 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas são diferentes.",
        variant: "destructive",
      });
      return;
    }

    setSavingSignaturePassword(true);
    try {
      /**
       * Endpoint DEDICADO. Nao use `PUT /users/:id { password }` aqui.
       *
       * Era exatamente isso que esta funcao fazia ate 2026-09-09, e `updateUserService`
       * grava esse campo em `user.password` — a senha de LOGIN. Quem tinha login
       * funcionando definia uma "senha de assinatura" diferente e perdia o acesso a
       * conta, com este mesmo toast dizendo "definida com sucesso". Atingia os 38
       * usuarios locais de producao.
       */
      const res = await apiRequest("PUT", "/users/me/signature-password", {
        password: trimmedPassword,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível salvar a senha de assinatura.");
      }

      setSignaturePassword("");
      setSignaturePasswordConfirm("");
      updateUserLocal({ signature_password_configured: true } as any);
      toast({
        title: "Senha de assinatura criada",
        description: "Sua senha de login não foi alterada.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar a senha.",
        variant: "destructive",
      });
    } finally {
      setSavingSignaturePassword(false);
    }
  };

  const providerProfileId = providerProfile?.provider_id ?? providerProfile?.id_provider ?? null;

  const handleOpenRatingsModal = async (shouldOpen = true) => {
    if (!providerProfileId) return;
    if (shouldOpen) setRatingsModalOpen(true);
    setRatingsModalLoading(true);
    try {
      const res = await apiRequest("GET", `/providers/${providerProfileId}/ratings`);
      if (!res.ok) throw new Error("Não foi possível carregar as avaliações");
      const data = await res.json();
      const latest = Array.isArray(data.ratings) ? data.ratings.slice(0, 3) : [];
      setRatingsModalData({
        average: data.average || 0,
        count: data.count || 0,
        list: data.ratings || [],
      });
      setRatingsPreview({
        average: data.average || 0,
        count: data.count || 0,
        latest,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao carregar avaliações",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setRatingsModalLoading(false);
    }
  };
  useEffect(() => {
    if (!providerProfileId || user?.type !== "prestador") return;
    void handleOpenRatingsModal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerProfileId]);

  // === Load ===
  const loadItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.type === "prestador") {
        const res = await apiRequest("GET", "/servicesfreelancer");
        const body = await res.json();
        setServices(body.servicesFreelancer || []);
      } else {
        const res = await apiRequest("GET", "/demands");
        const body = await res.json();
        // API returns demands under `demand`; keep fallback to `demands` for safety
        setDemands(Array.isArray(body.demand) ? body.demand : (body.demands || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    if (user?.type === "prestador") loadPortfolio();
  }, [user]);

  const loadPortfolio = async () => {
    if (!user) return;
    try {
      const res = await apiRequest("GET", `/portfolio?user=${user.id}`);
      if (res.ok) {
        const body = await res.json();
        setPortfolio(body.posts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    try {
      const res = await apiRequest("DELETE", `/portfolio/${id}`);
      if (!res.ok) throw new Error("Não foi possível excluir o destaque.");
      toast({ title: "Destaque removido" });
      setPortfolioModalOpen(false);
      setSelectedPortfolioItem(null);
      await loadPortfolio();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const handleEditPortfolio = (item: any) => {
    if (!item) return;
    setEditingPortfolioId(item.id);
    setNewPortfolioTitle(item.title || "");
    setNewPortfolioDescription(item.description || "");
    setNewPortfolioImageId(item.image_id || item.imageId || null);
    const preview = buildImageUrl(item?.UserImage?.image_path);
    setNewPortfolioPreview(preview || null);
    setPortfolioModalOpen(false);
    setIsUploadingImage(true);
  };

  const handleCreatePortfolio = async () => {
    if (!user) return;
    if (!newPortfolioFile && !newPortfolioImageId) {
      toast({
        title: "Selecione uma imagem",
        description: "Envie ou mantenha uma imagem para o destaque.",
        variant: "destructive",
      });
      return;
    }
    if (!newPortfolioTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Informe um título para o destaque.",
        variant: "destructive",
      });
      return;
    }
    setSavingPortfolio(true);
    try {
      const formData = new FormData();
      let imageId = newPortfolioImageId;
      if (newPortfolioFile) {
        formData.append("file", newPortfolioFile);
        formData.append("type", "portfolio");
        const uploadRes = await apiRequest("POST", "/upload/image", formData);
        const uploadBody = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || uploadBody?.success === false) {
          throw new Error(uploadBody?.message || "Falha ao enviar a imagem.");
        }
        imageId =
          uploadBody?.userImage?.id ||
          uploadBody?.imageUpload?.id ||
          uploadBody?.id;
        if (!imageId) {
          throw new Error("Não foi possível obter o ID da imagem.");
        }
      }

      const payload = {
        title: newPortfolioTitle.trim(),
        description: newPortfolioDescription.trim(),
        image_id: imageId,
      };
      const endpoint = editingPortfolioId ? `/portfolio/${editingPortfolioId}` : "/portfolio";
      const method = editingPortfolioId ? "PUT" : "POST";
      const res = await apiRequest(method, endpoint, payload);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "Não foi possível criar o destaque.");
      }

      toast({ title: "Destaque adicionado", description: "Seu portfólio foi atualizado." });
      setNewPortfolioTitle("");
      setNewPortfolioDescription("");
      setNewPortfolioFile(null);
      setNewPortfolioImageId(null);
      setIsUploadingImage(false);
      setEditingPortfolioId(null);
      await loadPortfolio();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar destaque",
        description: error?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSavingPortfolio(false);
    }
  };

  // === CRUD ===
  const handleCreate = async () => {
    if (!user) return;
    if (!newItem.title || !newItem.description) return;

    if (newItem.description.length < 30) {
      toast({
        title: "Poucos caracteres na descrição",
        description: "A descrição precisa ter pelo menos 30 caracteres",
        variant: "destructive"
      });
      return;
    }

    const digits = onlyDigits(newItem.price);
    if (!digits || Number(digits) === 0) {
      toast({
        title: "Preço inválido",
        description: "O preço precisa ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    setCreatingItem(true);
    try {
      const payload = { ...newItem, price: priceFromDigits(newItem.price), user_id: user.id };
      const endpoint = user.type === "prestador" ? "/servicesfreelancer" : "/demands";
      const res = await apiRequest("POST", endpoint, payload);
      const sla = await res.json();
      // verificar se é prestador pra mandar mensagem de criação
      const messageType = user.type === "prestador" ? "Serviço" : "Demanda";  
      // "service" : "demand";
      if (sla.id) {
        await apiRequest("POST", `/messages/${sla.id}`, { type: messageType });
      }
      if (res.ok) {
        toast({
          title: "Sucesso",
          description: `${messageType} criado(a) com sucesso!`,
          variant: "default",
        });
        setNewItem({ title: "", description: "", price: "" });
        setIsCreating(false);
        loadItems();
      }
    } catch (error: any) {
      toast({ title: "Erro ao salvar item", description: error?.message || "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setCreatingItem(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!user) return;
    try {
      const endpoint =
        user.type === "prestador"
          ? `/servicesfreelancer/${id}`
          : `/demands/${id}`;
      const payload = { ...draftItem, price: priceFromDigits(draftItem.price) };
      const res = await apiRequest("PUT", endpoint, payload);
      if (res.ok) {
        toast({ title: "Atualizado", description: "Item editado com sucesso!" });
        setEditingId(null);
        setDraftItem({});
        loadItems();
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    try {
      const endpoint =
        user.type === "prestador"
          ? `/servicesfreelancer/${id}`
          : `/demands/${id}`;
      const res = await apiRequest("DELETE", endpoint);
      if (res.ok) {
        toast({ title: "Removido", description: "Item deletado com sucesso!" });
        loadItems();
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };


  if (!user) {
    return (
      <AplicationLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AplicationLayout>
    );
  }

  return (
    <AplicationLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <ProfileHeader user={user as any} onLogout={logout} />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda: Nível de confiança (prestador), Informações, Sobre, Profissão */}
            <div className="space-y-6">
              {user.type === "prestador" && <TrustCard userId="me" />}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" /> {user.name}
                  </div>
              <Separator className="my-3" />
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email: {user.email || "Não informado"}
                  </div>
                  {user.type === "prestador" && providerProfile && (
                    <div className="mt-3 text-sm text-slate-600">
                      Visualizações do perfil: <span className="font-semibold">{providerProfile.views_profile || 0}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {user.type === "prestador" && (
                <>
                  <AboutCard
                    about={about}
                    isEditing={isEditingAbout}
                    setIsEditing={setIsEditingAbout}
                    setAbout={setAbout}
                    loading={loadingProviderInfo}
                    error={providerError}
                    saving={savingAbout}
                    providerProfile={providerProfile}
                    onSave={handleSaveAbout}
                  />
                  <ProfessionCard
                    profession={profession}
                    isEditing={isEditingProfession}
                    setIsEditing={setIsEditingProfession}
                    setProfession={setProfession}
                    saving={savingProfession}
                    providerProfile={providerProfile}
                    onSave={handleSaveProfession}
                  />
                </>
              )}
            </div>

            {/* Coluna Meio: Serviços e Portfólio */}
            <div className="space-y-6">
              <ServicesSection
                userType={user.type}
                serviceItems={user.type === "prestador" ? services : demands}
                loading={loading}
                editingId={editingId}
                draftItem={draftItem}
                setDraftItem={setDraftItem}
                setEditingId={setEditingId}
                handleUpdate={(id) => handleUpdate(id)}
                handleDelete={(id) => handleDelete(id)}
                isCreating={isCreating}
                setIsCreating={setIsCreating}
                newItem={newItem as any}
                setNewItem={setNewItem}
                handleCreate={handleCreate}
                creatingItem={creatingItem}
              />

              {user.type === "prestador" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Portfólio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolio.length === 0 ? (
                      <div className="text-slate-500 text-center">
                        Nenhum item de portfólio
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {portfolio.map((item) => (
                          <div
                            key={item.id}
                            className="border rounded-lg p-2 hover:shadow relative group"
                            onClick={() => {
                              setSelectedPortfolioItem(item);
                              setPortfolioModalOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-center h-16 text-slate-500">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                            <p className="text-sm mt-2 text-center truncate">{item.title}</p>
                            <div className="absolute top-1 right-1 hidden gap-1 group-hover:flex">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPortfolio(item);
                                }}
                                title="Editar destaque"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleDeletePortfolio(item.id);
                                }}
                                title="Excluir destaque"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={() => setIsUploadingImage(true)}
                      className="w-full mt-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Novo Destaque
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna Direita: Avaliações (botão/modal) e Documentos */}
            <div className="space-y-6">
              {user.type === "prestador" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Avaliações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {ratingsPreview.average ? ratingsPreview.average.toFixed(1) : "--"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {ratingsPreview.count} avaliação{ratingsPreview.count !== 1 ? "es" : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-orange-600 text-white"
                        disabled={!providerProfileId}
                        onClick={() => handleOpenRatingsModal(true)}
                      >
                        Ver todas
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {ratingsPreview.latest.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhuma avaliação ainda.</p>
                      ) : (
                        ratingsPreview.latest.map((r, idx) => (
                          <div key={idx} className="rounded-md border p-2">
                            <p className="text-sm font-semibold">
                              Nota {r.grade ?? r.rating ?? "--"}
                            </p>
                            {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                            {r.createdAt && (
                              <p className="text-xs text-slate-500">
                                {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {user.type === "prestador" && (
                <ReceivingAccountsCard
                  accounts={receivingAccounts}
                  loading={loadingReceivingAccounts}
                  onCreate={handleCreateReceivingAccount}
                  onUpdate={handleUpdateReceivingAccount}
                  onDelete={handleDeleteReceivingAccount}
                />
              )}

              <DocumentsCard
                data={documentsData}
                onChangeCpf={(value) =>
                  setDocumentsData((prev) => ({
                    ...prev,
                    cpf: formatCpf(value),
                  }))
                }
                onChangeCnpj={(value) =>
                  setDocumentsData((prev) => ({
                    ...prev,
                    cnpj: formatCnpj(value),
                  }))
                }
                loading={loadingDocuments}
                saving={savingDocuments}
                changed={documentsChanged}
                onSave={handleSaveDocuments}
                onCancel={handleCancelDocuments}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Senha de assinatura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* O texto antigo dizia "para contas com e-mail/senha, ela e a mesma
                      do login" — e o formulario, ao salvar, TROCAVA a senha de login.
                      Agora sao coisas separadas de verdade, e o texto precisa deixar
                      isso claro antes de a pessoa digitar. */}
                  <p className="text-sm text-slate-600">
                    Uma senha separada, usada só para assinar contratos e confirmar etapas.
                    Ela <strong>não altera a sua senha de login</strong>. Enquanto você não
                    cadastrar uma, seus contratos são assinados com a senha de login. Se
                    você entrou pelo Google, sua conta não tem senha de login, então
                    cadastre uma aqui ou assine usando a própria conta Google.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nova senha</label>
                    <Input
                      type="password"
                      value={signaturePassword}
                      onChange={(e) => setSignaturePassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Confirmar senha</label>
                    <Input
                      type="password"
                      value={signaturePasswordConfirm}
                      onChange={(e) => setSignaturePasswordConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      maxLength={50}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveSignaturePassword} disabled={savingSignaturePassword}>
                      {savingSignaturePassword ? "Salvando..." : "Salvar senha"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Endereço (privado)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingLocation ? (
                    <p className="text-sm text-slate-500">Carregando endereço...</p>
                  ) : locationInfo ? (
                    <div className="space-y-1 text-sm text-slate-700">
                      <p><span className="font-medium">CEP:</span> {formatCEP(locationInfo.cep || "")}</p>
                      <p><span className="font-medium">Rua:</span> {locationInfo.street || "—"}</p>
                      <p><span className="font-medium">Número:</span> {locationInfo.number || "—"}</p>
                      <p><span className="font-medium">Bairro:</span> {locationInfo.neighborhood || "—"}</p>
                      <p><span className="font-medium">Cidade/UF:</span> {locationInfo.city || "—"} / {locationInfo.state || "—"}</p>
                      <p><span className="font-medium">Tipo:</span> {locationInfo.typeLocation || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Nenhum endereço cadastrado.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isUploadingImage} onOpenChange={setIsUploadingImage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPortfolioId ? "Editar destaque" : "Novo destaque do portfólio"}</DialogTitle>
            <DialogDescription>Envie uma imagem e adicione título e descrição.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="portfolio-title">Título</label>
              <Input
                id="portfolio-title"
                value={newPortfolioTitle}
                onChange={(e) => setNewPortfolioTitle(e.target.value)}
                placeholder="Ex: Apartamento minimalista"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="portfolio-description">Descrição</label>
              <Textarea
                id="portfolio-description"
                value={newPortfolioDescription}
                onChange={(e) => setNewPortfolioDescription(e.target.value)}
                placeholder="Detalhes do projeto, materiais, escopo..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="portfolio-file">Imagem</label>
              <Input
                id="portfolio-file"
                type="file"
                accept="image/*"
                onChange={(e) => setNewPortfolioFile(e.target.files?.[0] || null)}
              />
              {newPortfolioPreview && (
                <div className="mt-2 rounded-md border overflow-hidden">
                  <img src={newPortfolioPreview} alt="Pré-visualização" className="w-full h-48 object-cover" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadingImage(false);
                setNewPortfolioFile(null);
                setNewPortfolioTitle("");
                setNewPortfolioDescription("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreatePortfolio} disabled={savingPortfolio}>
              {savingPortfolio ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {savingPortfolio ? "Salvando..." : "Salvar destaque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PortfolioModal
        isOpen={portfolioModalOpen}
        onClose={() => {
          setPortfolioModalOpen(false);
          setSelectedPortfolioItem(null);
        }}
        item={selectedPortfolioItem}
        imageUrl={buildImageUrl(selectedPortfolioItem?.UserImage?.image_path)}
        userName={user.name}
        userAvatar={buildImageUrl((user as any)?.perfil)}
        viewerName={user.name}
        viewerAvatar={buildImageUrl((user as any)?.perfil)}
        initialLikes={0}
        initialLiked={false}
        initialComments={[]}
        onDelete={(id) => handleDeletePortfolio(id)}
        onEdit={(item) => handleEditPortfolio(item)}
      />
      <RatingsModal
        open={ratingsModalOpen}
        onOpenChange={(open) => {
          setRatingsModalOpen(open);
          if (!open) {
            setRatingsModalData(null);
          } else if (!ratingsModalData && providerProfileId) {
            handleOpenRatingsModal(true);
          }
        }}
        loading={ratingsModalLoading}
        data={ratingsModalData}
        onReload={handleOpenRatingsModal}
        providerProfileId={providerProfileId}
      />
    </AplicationLayout>
  );
}
