import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Save, Upload, Trash2, ImageIcon, CreditCard, ChevronDown, MapPin, Settings2, User, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useStore } from '../store';
import { upsertProfile, getProfile, supabase } from '../lib/supabase';
import { companySchema, settingsSchema } from '../lib/validations';
import { maskPhone, maskCnpj, maskCep } from '../lib/utils';
import { generatePixPayload } from '../lib/pix';
import { toast } from '../hooks/useToast';
import QRCode from 'qrcode';
import type { Address } from '../types';

interface CompanyFormData {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: Address;
  logo_url: string;
}

interface SettingsFormData {
  validade_padrao: number;
  observacoes_padrao: string;
  unidades_customizadas: string[];
}

const PIX_TYPE_OPTIONS = [
  { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { value: 'email', label: 'Email' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
] as const;

const PIX_MAX_LENGTH = 200;

const EMPRESA_SECTIONS = ['logo', 'dados', 'endereco', 'pix'] as const;
const PREFERENCIAS_SECTIONS = ['preferencias'] as const;
const CONTA_SECTIONS = ['conta'] as const;

/** Accordion card: mobile e desktop. Usuário abre/fecha manualmente. */
function AccordionCard({
  id,
  title,
  description,
  icon,
  openSections,
  onToggle,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  openSections: string[];
  onToggle: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isOpen = openSections.includes(id);

  return (
    <div className={className ?? ''}>
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              <p className="font-semibold text-[rgb(var(--fg))]">{title}</p>
              {description && (
                <p className="text-sm text-[rgb(var(--muted))] truncate">{description}</p>
              )}
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-[rgb(var(--muted))] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && <div className="border-t border-[rgb(var(--border))] p-4">{children}</div>}
      </div>
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { company, settings, setCompany, setSettings, logout } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pixType, setPixType] = useState<string>('');
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [pixCity, setPixCity] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Carregar profile ao abrir a página (inclui dados Pix)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      try {
        const profile = await getProfile(uid);
        if (profile) {
          setPixType(profile.pix_type ?? '');
          setPixKey(profile.pix_key ?? '');
          setPixName(profile.pix_name ?? '');
          setPixCity(profile.pix_city ?? '');
        }
      } catch (err) {
        console.error('Erro ao carregar profile:', err);
      }
    })();
  }, []);

  // Gerar QR Code Pix quando pix_key, pix_name e pix_type estiverem preenchidos
  useEffect(() => {
    const keyOk = pixKey.trim().length > 0;
    const nameOk = pixName.trim().length > 0;
    const typeOk = pixType.trim().length > 0;
    if (!keyOk || !nameOk || !typeOk) {
      setQrCodeDataUrl(null);
      return;
    }
    (async () => {
      try {
        const payload = generatePixPayload({
          key: pixKey.trim(),
          name: pixName.trim(),
          city: pixCity.trim() || null,
          type: pixType,
        });
        const dataUrl = await QRCode.toDataURL(payload, { width: 256, margin: 2 });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Erro ao gerar QR Code Pix:', err);
        setQrCodeDataUrl(null);
      }
    })();
  }, [pixKey, pixName, pixType, pixCity]);

  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema) as any,
    defaultValues: {
      nome: company.nome,
      cnpj: company.cnpj,
      telefone: company.telefone,
      email: company.email,
      endereco: company.endereco,
      logo_url: company.logo_url,
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      validade_padrao: settings.validade_padrao,
      observacoes_padrao: settings.observacoes_padrao,
      unidades_customizadas: settings.unidades_customizadas,
    },
  });

  const onCompanySubmit = async (data: CompanyFormData) => {
    // Validação Pix: pix_type obrigatório se pix_key preenchido, pix_key obrigatório se pix_type selecionado, pix_name obrigatório se pix_key existir
    const hasPixKey = pixKey.trim().length > 0;
    const hasPixType = pixType.trim().length > 0;
    if (hasPixKey && !hasPixType) {
      toast({
        title: 'Dados Pix incompletos',
        description: 'Selecione o tipo da chave Pix.',
        variant: 'destructive',
      });
      return;
    }
    if (hasPixType && !hasPixKey) {
      toast({
        title: 'Dados Pix incompletos',
        description: 'Informe a chave Pix.',
        variant: 'destructive',
      });
      return;
    }
    if (hasPixKey && !pixName.trim()) {
      toast({
        title: 'Dados Pix incompletos',
        description: 'Informe o nome do recebedor.',
        variant: 'destructive',
      });
      return;
    }
    // Limitar 200 caracteres
    const pixKeyTrimmed = pixKey.trim().slice(0, PIX_MAX_LENGTH);
    const pixNameTrimmed = pixName.trim().slice(0, PIX_MAX_LENGTH);
    const pixCityTrimmed = pixCity.trim().slice(0, PIX_MAX_LENGTH);

    setCompany({
      ...company,
      ...data,
      pix_key: hasPixKey ? pixKeyTrimmed : null,
      pix_type: hasPixType ? pixType : null,
      pix_name: hasPixKey ? pixNameTrimmed : null,
      pix_city: hasPixKey ? (pixCityTrimmed || null) : null,
    });

    const { data: { session } } = await supabase.auth.getSession();
    const actualUserId = session?.user?.id;

    // Se houver um usuário autenticado, persiste no Supabase (profile)
    if (actualUserId) {
      try {
        await upsertProfile({
          id: actualUserId,
          email: data.email ?? null,
          company_name: data.nome ?? null,
          cnpj: data.cnpj ?? null,
          phone: data.telefone ?? null,
          cep: data.endereco?.cep ?? null,
          street: data.endereco?.rua ?? null,
          number: data.endereco?.numero ?? null,
          complement: data.endereco?.complemento ?? null,
          district: data.endereco?.bairro ?? null,
          city: data.endereco?.cidade ?? null,
          state: data.endereco?.estado ?? null,
          logo_url: data.logo_url ?? null,
          pix_key: hasPixKey ? pixKeyTrimmed : null,
          pix_type: hasPixType ? pixType : null,
          pix_name: hasPixKey ? pixNameTrimmed : null,
          pix_city: hasPixKey ? (pixCityTrimmed || null) : null,
        });
        toast({
          title: 'Dados sincronizados',
          description: 'As informações da empresa foram salvas na sua conta com privacidade.',
          variant: 'success',
        });
      } catch (error) {
        console.error('Erro ao salvar perfil no Supabase:', error);
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar os dados no servidor. Eles foram atualizados localmente.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Dados salvos',
        description: 'As informações da empresa foram atualizadas localmente.',
        variant: 'success',
      });
    }
  };

  const onSettingsSubmit = (data: SettingsFormData) => {
    // atualiza estado local imediatamente
    setSettings(data);

    (async () => {
      try {
        // obtém usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id;

        if (!uid) {
          toast({
            title: 'Preferências salvas (local)',
            description: 'Usuário não autenticado — preferências salvas localmente.',
            variant: 'default',
          });
          return;
        }

        // persiste no profile (garante valores não-nulos)
        const { error } = await supabase
          .from('profiles')
          .update({
            default_notes: data.observacoes_padrao ?? '',
            // envia string vazia quando não houver valor, conforme regras
            default_validity_days: data.validade_padrao === undefined || data.validade_padrao === null
              ? ''
              : data.validade_padrao,
          })
          .eq('id', uid);

        if (error) {
          console.error('Erro ao salvar preferências no Supabase:', error);
          toast({
            title: 'Erro ao salvar',
            description: 'Não foi possível persistir as preferências no servidor.',
            variant: 'destructive',
          });
          return;
        }

        // recarrega preferências do profile e atualiza estado
        const { data: prefs, error: prefsError } = await supabase
          .from('profiles')
          .select('default_notes, default_validity_days')
          .eq('id', uid)
          .single();

        if (!prefsError && prefs) {
          setSettings({
            observacoes_padrao: prefs.default_notes ?? '',
            validade_padrao:
              prefs.default_validity_days !== null && prefs.default_validity_days !== undefined
                ? Number(prefs.default_validity_days) || settings.validade_padrao
                : settings.validade_padrao,
            unidades_customizadas: settings.unidades_customizadas,
          });
        }

        toast({
          title: 'Preferências salvas',
          description: 'Suas preferências foram atualizadas.',
          variant: 'success',
        });
      } catch (err) {
        console.error('Erro ao salvar preferências:', err);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao salvar as preferências.',
          variant: 'destructive',
        });
      }
    })();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    companyForm.setValue('telefone', masked);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCnpj(e.target.value);
    companyForm.setValue('cnpj', masked);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCep(e.target.value);
    companyForm.setValue('endereco.cep', masked);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    (async () => {
      try {
        // tenta obter user da sessão
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id ?? null;

        if (!uid) {
          // fallback (mantém comportamento antigo quando não autenticado)
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            companyForm.setValue('logo_url', base64);
            setCompany({ ...company, logo_url: base64 });
          toast({
            title: 'Logo atualizado (local)',
            description: 'Usuário não autenticado — logo armazenada localmente.',
            variant: 'default',
          });
          };
          reader.readAsDataURL(file);
          return;
        }

        // construir nome único: logo-{userId}-{timestamp}.{extensão}
        const extMatch = (file.name || '').match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : 'png';
        const timestamp = Date.now();
        const filename = `logo-${uid}-${timestamp}.${ext}`;
        const path = `logos/${filename}`;

        // upload para bucket 'Logos'
        const { error: uploadError } = await supabase.storage
          .from('Logos')
          .upload(path, file, { upsert: true });

        if (uploadError) {
          console.error('Erro ao fazer upload do logo:', uploadError);
          toast({
            title: 'Erro no upload',
            description: 'Não foi possível enviar a imagem para o servidor.',
            variant: 'destructive',
          });
          return;
        }

        // obter URL pública (assume bucket público); fallback para diferentes chaves
        const publicData: any = supabase.storage.from('Logos').getPublicUrl(path);
        const publicUrl = publicData?.data?.publicUrl ?? publicData?.publicURL ?? publicData?.data?.publicURL ?? null;

        if (!publicUrl) {
          toast({
            title: 'Upload realizado',
            description: 'Imagem enviada, mas não foi possível gerar a URL pública.',
            variant: 'default',
          });
          return;
        }

        // atualiza formulário e estado local — persistência no DB ocorre ao salvar o form
        companyForm.setValue('logo_url', publicUrl);
        setCompany({ ...company, logo_url: publicUrl });
        toast({
          title: 'Logo enviado',
          description: 'Logo enviado para o storage e atualizado localmente.',
          variant: 'success',
        });
      } catch (err) {
        console.error('Erro no handleLogoUpload:', err);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao processar a imagem.',
          variant: 'destructive',
        });
      }
    })();
  };

  const handleRemoveLogo = () => {
    companyForm.setValue('logo_url', '');
    setCompany({ ...company, logo_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: 'Logo removido',
      description: 'O logo da empresa foi removido.',
      variant: 'success',
    });
  };

  const currentLogo = companyForm.watch('logo_url') || company.logo_url;
  const [userEmail, setUserEmail] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'empresa' | 'preferencias' | 'conta'>('empresa');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? '');
    });
  }, []);
  /** Todos os cards iniciam fechados, exceto "Logo da Empresa" que inicia aberto. */
  const [openSections, setOpenSections] = useState<string[]>(['logo']);

  useEffect(() => {
    if (activeTab === 'preferencias') {
      setOpenSections([...PREFERENCIAS_SECTIONS]);
    } else if (activeTab === 'conta') {
      setOpenSections([...CONTA_SECTIONS]);
    } else {
      setOpenSections(['logo']);
    }
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8 pb-36 lg:pb-6 min-h-screen bg-[rgb(var(--bg))]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--fg))]">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as informações da sua empresa</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'empresa' | 'preferencias' | 'conta')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-6 lg:mt-8">
          <form id="empresa-form" onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <AccordionCard
                id="logo"
                title="Logo da Empresa"
                description="Aparecerá nos orçamentos em PDF"
                icon={<ImageIcon className="h-5 w-5" />}
                openSections={openSections}
                onToggle={handleToggleSection}
                className="lg:col-span-1"
              >
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    {currentLogo ? (
                      <div className="relative group">
                        <div className="w-40 h-40 rounded-xl border-2 border-[rgb(var(--border))] overflow-hidden bg-[rgb(var(--card))] flex items-center justify-center p-4">
                          <img
                            src={currentLogo}
                            alt="Logo da empresa"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={handleRemoveLogo}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-xl border-2 border-dashed border-[rgb(var(--border))] flex flex-col items-center justify-center text-[rgb(var(--muted))] bg-gray-50 dark:bg-white/5">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <span className="text-sm">Sem logo</span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {currentLogo ? 'Trocar Logo' : 'Enviar Logo'}
                    </Button>
                    {currentLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRemoveLogo}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover Logo
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-[rgb(var(--muted))] text-center">
                    Formatos: JPG, PNG, GIF. Tamanho máximo: 2MB
                  </p>
                </div>
              </AccordionCard>

              <AccordionCard
                id="dados"
                title="Dados da Empresa"
                description="Informações que aparecerão nos orçamentos"
                icon={<Building2 className="h-5 w-5" />}
                openSections={openSections}
                onToggle={handleToggleSection}
                className="lg:col-span-1"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome / Razão Social</Label>
                    <Input
                      id="nome"
                      {...companyForm.register('nome')}
                      error={!!companyForm.formState.errors.nome}
                    />
                    {companyForm.formState.errors.nome && (
                      <p className="text-sm text-red-500">
                        {companyForm.formState.errors.nome.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      {...companyForm.register('cnpj')}
                      onChange={handleCnpjChange}
                      error={!!companyForm.formState.errors.cnpj}
                      placeholder="00.000.000/0000-00"
                    />
                    {companyForm.formState.errors.cnpj && (
                      <p className="text-sm text-red-500">
                        {companyForm.formState.errors.cnpj.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        {...companyForm.register('telefone')}
                        onChange={handlePhoneChange}
                        error={!!companyForm.formState.errors.telefone}
                        placeholder="(00) 00000-0000"
                      />
                      {companyForm.formState.errors.telefone && (
                        <p className="text-sm text-red-500">
                          {companyForm.formState.errors.telefone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        {...companyForm.register('email')}
                        error={!!companyForm.formState.errors.email}
                      />
                      {companyForm.formState.errors.email && (
                        <p className="text-sm text-red-500">
                          {companyForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionCard>

              <AccordionCard
                id="endereco"
                title="Endereço"
                description="Endereço comercial da empresa"
                icon={<MapPin className="h-5 w-5" />}
                openSections={openSections}
                onToggle={handleToggleSection}
                className="lg:col-span-1"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      {...companyForm.register('endereco.cep')}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="rua">Rua</Label>
                      <Input
                        id="rua"
                        {...companyForm.register('endereco.rua')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        {...companyForm.register('endereco.numero')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      {...companyForm.register('endereco.complemento')}
                      placeholder="Sala, Andar, etc."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        {...companyForm.register('endereco.bairro')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        {...companyForm.register('endereco.cidade')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Controller
                        name="endereco.estado"
                        control={companyForm.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                            <SelectContent>
                              {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
                                <SelectItem key={uf} value={uf}>
                                  {uf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </AccordionCard>

              <AccordionCard
                id="pix"
                title="Pagamento (Pix)"
                description="Dados para recebimento via Pix"
                icon={<CreditCard className="h-5 w-5" />}
                openSections={openSections}
                onToggle={handleToggleSection}
                className="lg:col-span-3"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pix_type">Tipo da chave Pix</Label>
                      <Select value={pixType} onValueChange={setPixType}>
                        <SelectTrigger id="pix_type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {PIX_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pix_key">Chave Pix</Label>
                      <Input
                        id="pix_key"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value.slice(0, PIX_MAX_LENGTH))}
                        placeholder="Ex: 123.456.789-00 ou email@exemplo.com"
                        maxLength={PIX_MAX_LENGTH}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pix_name">Nome do recebedor</Label>
                      <Input
                        id="pix_name"
                        value={pixName}
                        onChange={(e) => setPixName(e.target.value.slice(0, PIX_MAX_LENGTH))}
                        placeholder="Nome ou razão social"
                        maxLength={PIX_MAX_LENGTH}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pix_city">Cidade (opcional)</Label>
                      <Input
                        id="pix_city"
                        value={pixCity}
                        onChange={(e) => setPixCity(e.target.value.slice(0, PIX_MAX_LENGTH))}
                        placeholder="Cidade do titular"
                        maxLength={PIX_MAX_LENGTH}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Esses dados serão exibidos no orçamento público e no PDF.
                  </p>

                  <div className="border border-[rgb(var(--border))] rounded-lg p-4 space-y-3 bg-[rgb(var(--card))]/50">
                    <p className="text-sm font-medium">
                      Pix: {pixKey.trim() || '—'}
                    </p>
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code Pix"
                        className="w-32 h-32 rounded object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs text-center px-2">
                        QR code será exibido aqui
                      </div>
                    )}
                  </div>
                </div>
              </AccordionCard>
            </div>

            <div className="flex justify-end mt-6 hidden lg:flex">
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Salvar Dados da Empresa
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-6 lg:mt-8">
          <form id="preferencias-form" onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}>
            <AccordionCard
              id="preferencias"
              title="Preferências de Orçamentos"
              description="Configurações padrão para novos orçamentos"
              icon={<Settings2 className="h-5 w-5" />}
              openSections={openSections}
              onToggle={handleToggleSection}
              className="max-w-2xl"
            >
              <div className="space-y-6 p-4">
                <div className="space-y-2">
                  <Label htmlFor="validade_padrao">Validade Padrão (dias)</Label>
                  <Controller
                    name="validade_padrao"
                    control={settingsForm.control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={field.value.toString()}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 dias</SelectItem>
                          <SelectItem value="15">15 dias</SelectItem>
                          <SelectItem value="30">30 dias</SelectItem>
                          <SelectItem value="60">60 dias</SelectItem>
                          <SelectItem value="90">90 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes_padrao">Observações Padrão</Label>
                  <Textarea
                    id="observacoes_padrao"
                    {...settingsForm.register('observacoes_padrao')}
                    placeholder="Texto que aparecerá por padrão nos novos orçamentos"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end hidden lg:flex">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Preferências
                  </Button>
                </div>
              </div>
            </AccordionCard>
          </form>
        </TabsContent>

        <TabsContent value="conta" className="mt-6 lg:mt-8">
          <AccordionCard
            id="conta"
            title="Conta"
            description="Dados da sua conta e sessão"
            icon={<User className="h-5 w-5" />}
            openSections={openSections}
            onToggle={handleToggleSection}
            className="max-w-2xl"
          >
            <div className="space-y-6 p-4">
              <div className="space-y-2">
                <Label className="text-sm text-[rgb(var(--muted))]">E-mail</Label>
                <Input
                  value={userEmail}
                  readOnly
                  disabled
                  className="bg-gray-50 dark:bg-white/5 text-[rgb(var(--fg))] cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[rgb(var(--muted))]">Plano atual</Label>
                <p className="text-sm text-[rgb(var(--muted))] py-2">Free</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </AccordionCard>
        </TabsContent>
      </Tabs>

      {/* Sticky footer - apenas mobile (oculto na aba Conta) */}
      <div
        className={`fixed bottom-16 left-0 right-0 z-30 bg-[rgb(var(--card))] border-t border-[rgb(var(--border))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 lg:hidden ${activeTab === 'conta' ? 'hidden' : ''}`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-[640px] mx-auto">
          {activeTab === 'empresa' ? (
            <Button
              type="submit"
              form="empresa-form"
              className="w-full h-12"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar dados
            </Button>
          ) : (
            <Button
              type="submit"
              form="preferencias-form"
              className="w-full h-12"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar preferências
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
