import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "../legal-page";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Emprego Fácil MZ recolhe, usa e protege os seus dados pessoais.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Política de privacidade"
      updated="26 de setembro de 2026"
      intro="Os seus CVs contêm dados pessoais. Tratamo-los com cuidado, usamo-los apenas para prestar o serviço e nunca os tornamos públicos."
    >
      <h2>1. Que dados recolhemos</h2>
      <ul>
        <li><strong>Dados de conta:</strong> nome, email, telefone (opcional) e senha (guardada apenas em formato cifrado irreversível — hash).</li>
        <li><strong>Conteúdo que cria:</strong> CVs, fotografias opcionais e outros documentos que introduzir na plataforma.</li>
        <li><strong>Compras:</strong> produtos, valores, estado do pagamento e o nome/email/telefone indicados no pedido. Não guardamos dados completos de cartões nem PINs de carteiras móveis.</li>
        <li><strong>Dados técnicos:</strong> registos de segurança (ex.: tentativas de login) com o endereço IP pseudonimizado.</li>
      </ul>

      <h2>2. Para que usamos os dados</h2>
      <ul>
        <li>Criar e manter a sua conta e permitir o acesso aos seus documentos.</li>
        <li>Gerar os seus CVs e documentos em PDF e Word.</li>
        <li>Processar pedidos e entregar os produtos comprados.</li>
        <li>Enviar emails necessários ao serviço (ex.: recuperação de senha, confirmação de pedido).</li>
        <li>Enviar dicas e novidades, <strong>apenas</strong> se der consentimento — pode retirá-lo a qualquer momento no seu perfil.</li>
        <li>Proteger a plataforma contra abusos e acessos não autorizados.</li>
      </ul>

      <h2>3. Quem tem acesso</h2>
      <p>
        Os seus CVs são privados: só podem ser vistos e descarregados por si, depois de entrar na sua conta. Não vendemos dados pessoais. Recorremos a fornecedores de
        serviços (alojamento, base de dados, armazenamento de ficheiros, envio de email e, quando disponíveis, processadores de pagamento) que tratam dados apenas em
        nosso nome e para estas finalidades.
      </p>
      <p>
        <strong>Assistente de IA (opcional).</strong> Quando usa «Melhorar com IA», o texto que escolhe (por exemplo, o resumo ou a descrição de funções) e, se a colar, a
        descrição de uma vaga, podem ser enviados a um provedor externo de inteligência artificial — sempre depois de pedir o seu consentimento, que pode retirar no perfil.
        Não enviamos a sua fotografia nem o seu nome; emails, telefones e links são substituídos antes do envio. Não guardamos o texto enviado nem as sugestões, e nada é
        alterado no seu CV sem a sua confirmação. A IA não deve inventar informação: reveja sempre as sugestões.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Usamos um cookie essencial para manter a sua sessão iniciada. Ferramentas de análise ou publicidade (ex.: Google Analytics, Meta Pixel) só serão ativadas com o seu
        consentimento prévio.
      </p>

      <h2>5. Conservação</h2>
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Se eliminar a conta, apagamos os seus CVs, fotografias, documentos e sessões. Registos de pedidos pagos podem ser
        conservados pelo período exigido por obrigações legais e contabilísticas.
      </p>

      <h2>6. Os seus direitos</h2>
      <ul>
        <li>Consultar e corrigir os seus dados em <Link href="/meu-espaco/perfil" className="font-semibold text-brand-700 underline">Meu Espaço → Perfil</Link>.</li>
        <li>Eliminar a conta e os dados associados, na mesma página.</li>
        <li>Retirar o consentimento para comunicações de marketing.</li>
        <li>Contactar-nos para qualquer questão sobre privacidade através da página de <Link href="/contactos" className="font-semibold text-brand-700 underline">contactos</Link>.</li>
      </ul>

      <h2>7. Segurança</h2>
      <p>
        Usamos ligações cifradas (HTTPS), senhas com hash, sessões seguras, controlo de acessos por conta e registos de auditoria. Nenhum sistema é totalmente
        invulnerável; se detetarmos um incidente que afete os seus dados, informaremos conforme a legislação aplicável.
      </p>

      <h2>8. Alterações</h2>
      <p>Podemos atualizar esta política. Alterações relevantes serão comunicadas na plataforma ou por email.</p>
    </ProsePage>
  );
}
