export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      <p className="text-sm text-gray-500 mb-8">
        Última actualización: 3 de julio de 2026
      </p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Responsable del tratamiento</h2>
        <p>
          Cooperativa Guadalupana, con domicilio en Guatemala, es la responsable del
          tratamiento de sus datos personales en relación con el servicio de atención
          de leads a través de WhatsApp.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Datos que recopilamos</h2>
        <p>A través de WhatsApp e Instagram recopilamos:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Número de teléfono o ID de usuario de la red social</li>
          <li>Nombre de perfil</li>
          <li>Mensajes e imágenes que nos envía</li>
          <li>Anuncio de origen (si llegó a través de un anuncio de Meta)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Finalidad del tratamiento</h2>
        <p>Sus datos se tratan para:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Gestionar y dar seguimiento a sus solicitudes de información</li>
          <li>Atribuir leads a campañas publicitarias para medir su rendimiento</li>
          <li>Mejorar nuestros servicios de atención al cliente</li>
          <li>Enviar información sobre productos y servicios financieros, si usted lo ha solicitado</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Base legal</h2>
        <p>
          El tratamiento de sus datos se basa en su consentimiento explícito al iniciar
          una conversación con nosotros a través de WhatsApp o Instagram, así como en la
          relación precontractual o contractual cuando solicita información sobre nuestros
          productos financieros.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Destinatarios de los datos</h2>
        <p>
          Sus datos no serán cedidos a terceros salvo obligación legal. Meta Platforms
          Inc. actúa como encargado del tratamiento en la transmisión de los mensajes a
          través de WhatsApp Cloud API e Instagram Graph API.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Conservación de los datos</h2>
        <p>
          Conservamos sus datos durante la vigencia de la relación comercial y hasta 12
          meses después de su última interacción, salvo que usted solicite su eliminación
          antes.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Sus derechos</h2>
        <p>Puede ejercer sus derechos de acceso, rectificación, cancelación y oposición</p>
        <p className="mt-2">
          Para ejercer sus derechos, contáctenos en:{/* Enlace corregido */}
          <a href="mailto:privacidad@guadalupana.com.gt" className="text-blue-600 hover:underline ml-1">
            privacidad@guadalupana.com.gt
          </a>
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Cambios a esta política</h2>
        <p>
          Nos reservamos el derecho de actualizar esta política de privacidad en cualquier
          momento. Notificaremos los cambios publicando la nueva versión en esta misma URL.
        </p>
      </section>
    </div>
  );
}
