import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "../legal-page";

export const metadata: Metadata = {
  title: "Termos de utilização",
  description: "Condições de utilização da plataforma Emprego Fácil MZ.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return (
    <ProsePage title="Termos de utilização" updated="26 de setembro de 2026">
      <h2>1. O serviço</h2>
      <p>
        O Emprego Fácil MZ disponibiliza ferramentas e materiais digitais para ajudar na preparação de candidaturas a emprego: criação de CVs, modelos de cartas, guias e
        kits digitais.
      </p>

      <h2>2. Sem garantia de emprego</h2>
      <p>
        <strong>Não garantimos a obtenção de emprego, entrevistas ou respostas de recrutadores.</strong> Os nossos materiais ajudam a apresentar a candidatura de forma mais
        clara e profissional; a decisão de contratação pertence sempre ao empregador.
      </p>

      <h2>3. A sua conta</h2>
      <ul>
        <li>Deve fornecer informações verdadeiras e manter a senha confidencial.</li>
        <li>É responsável pela atividade realizada na sua conta.</li>
        <li>Pode eliminar a conta a qualquer momento em Meu Espaço → Perfil.</li>
      </ul>

      <h2>4. Conteúdo dos CVs e documentos</h2>
      <p>
        O conteúdo dos seus documentos é da sua responsabilidade. Compromete-se a <strong>não incluir informações falsas</strong> sobre experiência, formação, diplomas ou
        certificações. Revise todas as informações antes de enviar uma candidatura.
      </p>

      <h2>5. Produtos digitais</h2>
      <ul>
        <li>Os preços são apresentados em Meticais (MT) e podem ser alterados; aplica-se o preço indicado no momento do pedido.</li>
        <li>Após confirmação do pagamento, os produtos ficam disponíveis para download na sua conta.</li>
        <li>Os materiais são para uso pessoal. Não é permitido revendê-los ou distribuí-los.</li>
        <li>Se tiver problemas com um pedido, contacte-nos através da página de <Link href="/contactos" className="font-semibold text-brand-700 underline">contactos</Link>.</li>
      </ul>

      <h2>6. Utilização aceitável</h2>
      <p>Não é permitido tentar aceder a contas ou documentos de terceiros, interferir no funcionamento da plataforma ou usá-la para fins ilegais.</p>

      <h2>7. Privacidade</h2>
      <p>
        O tratamento de dados pessoais segue a nossa <Link href="/privacidade" className="font-semibold text-brand-700 underline">política de privacidade</Link>.
      </p>

      <h2>8. Alterações</h2>
      <p>Podemos atualizar estes termos. A utilização continuada após alterações implica a aceitação da nova versão.</p>
    </ProsePage>
  );
}
