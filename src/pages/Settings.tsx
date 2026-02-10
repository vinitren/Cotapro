import { useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Save, Upload, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useStore } from '../store';
import { upsertProfile, supabase } from '../lib/supabase';
import { companySchema, settingsSchema } from '../lib/validations';
import { maskPhone, maskCnpj, maskCep } from '../lib/utils';
import { toast } from '../hooks/useToast';
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

export function Settings() {
  const { company, settings, setCompany, setSettings } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCompany({ ...company, ...data });

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
    setSettings(data);
    toast({
      title: 'Preferências salvas',
      description: 'Suas preferências foram atualizadas.',
      variant: 'success',
    });
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">Gerencie as informações da sua empresa</p>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-6">
          <form onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Logo da Empresa
                  </CardTitle>
                  <CardDescription>
                    Aparecerá nos orçamentos em PDF
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center">
                    {currentLogo ? (
                      <div className="relative group">
                        <div className="w-40 h-40 rounded-xl border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center p-4">
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
                      <div className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
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

                  <p className="text-xs text-gray-500 text-center">
                    Formatos: JPG, PNG, GIF. Tamanho máximo: 2MB
                  </p>
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados da Empresa
                  </CardTitle>
                  <CardDescription>
                    Informações que aparecerão nos orçamentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                  <CardDescription>
                    Endereço comercial da empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mt-6">
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Salvar Dados da Empresa
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-6">
          <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)}>
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle>Preferências de Orçamentos</CardTitle>
                <CardDescription>
                  Configurações padrão para novos orçamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
