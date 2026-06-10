'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export const PRIVACY_POLICY_VERSION = '1.0';
export const PRIVACY_POLICY_DATE = '24 de mayo de 2025';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-foreground">

      <section className="space-y-2">
        <h3 className="font-bold text-base">1. Responsable del tratamiento</h3>
        <p>
          El responsable del tratamiento de los datos personales recogidos a través de <strong>Axiom</strong> es
          <strong> Carlos Gutiérrez</strong>, en el contexto de un Trabajo de Fin de Título (TFT) de Diseño de
          Sistemas Personales. Contacto: <span className="font-mono text-xs">c.gutierrez.con@gmail.com</span>.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">2. Datos que se tratan</h3>
        <p>Axiom recopila y procesa las siguientes categorías de datos personales:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li><strong className="text-foreground">Datos de identificación:</strong> dirección de correo electrónico, nombre de usuario, foto de perfil (opcionalmente proporcionada por Google).</li>
          <li><strong className="text-foreground">Datos biométricos y de salud:</strong> patrones de sueño, nivel de energía, cortisol estimado, estado emocional, indicadores de estrés y otros biomarcadores derivados de eventos registrados manualmente.</li>
          <li><strong className="text-foreground">Datos conductuales:</strong> hábitos diarios, actividad física, consumo de sustancias (cafeína, alcohol), uso de tecnología y comportamientos registrados por el usuario.</li>
          <li><strong className="text-foreground">Datos financieros:</strong> ingresos, gastos, deudas y transacciones económicas introducidas voluntariamente.</li>
          <li><strong className="text-foreground">Datos relacionales:</strong> información sobre relaciones personales (nombre, rol, energía percibida), sin acceso a datos de terceros.</li>
          <li><strong className="text-foreground">Datos de uso:</strong> registros de eventos, marcas temporales, configuración de la aplicación.</li>
        </ul>
        <p className="text-muted-foreground text-xs mt-2">
          ⚠️ Los datos de salud y comportamiento constituyen <strong>datos de categoría especial</strong> conforme al artículo 9 del RGPD y requieren consentimiento explícito.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">3. Finalidad y base jurídica del tratamiento</h3>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-semibold text-xs uppercase tracking-wider text-primary">Finalidad principal</p>
            <p>Proporcionar al usuario un sistema de análisis personal y gestión de vida basado en sus propios datos, generando indicadores, alertas y recomendaciones personalizadas.</p>
            <p className="text-xs text-muted-foreground">Base jurídica: <strong>Consentimiento explícito del interesado</strong> (Art. 6.1.a y Art. 9.2.a RGPD).</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Mejora del servicio</p>
            <p>Los datos agregados y anonimizados pueden usarse para mejorar los algoritmos de cálculo del motor clínico.</p>
            <p className="text-xs text-muted-foreground">Base jurídica: <strong>Interés legítimo</strong> (Art. 6.1.f RGPD).</p>
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">4. Destinatarios y encargados del tratamiento</h3>
        <p>
          Los datos se almacenan en <strong>Firebase (Google LLC)</strong>, que actúa como encargado del tratamiento bajo
          las Cláusulas Contractuales Estándar (SCC) aprobadas por la Comisión Europea. Firebase puede almacenar datos
          en servidores ubicados dentro y fuera del Espacio Económico Europeo (EEE).
        </p>
        <p className="text-muted-foreground">
          No se ceden datos a terceros con fines comerciales ni publicitarios. Axiom no vende, alquila ni comparte
          datos personales con terceros ajenos al servicio.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">5. Transferencias internacionales</h3>
        <p>
          Google Firebase puede transferir datos fuera del EEE. Estas transferencias están amparadas por las
          Cláusulas Contractuales Estándar (Dec. 2021/914/UE) y los mecanismos de adecuación vigentes.
          Más información en el{' '}
          <span className="underline">Centro de privacidad de Firebase</span>.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">6. Plazo de conservación</h3>
        <p>
          Los datos se conservan mientras el usuario mantenga su cuenta activa en Axiom.
          Al eliminar la cuenta, se suprimen los datos de autenticación. Los datos almacenados en
          Firestore permanecen vinculados al UID del usuario hasta que se solicite su eliminación
          explícita o se elimine el proyecto.
        </p>
        <p className="text-muted-foreground text-xs">
          Los datos de logs y copias de seguridad de Firebase pueden tardar hasta 180 días en eliminarse
          completamente de los sistemas de Google.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">7. Derechos del interesado</h3>
        <p>En virtud del RGPD, tienes derecho a:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['Acceso (Art. 15)', 'Solicitar una copia de todos tus datos personales tratados.'],
            ['Rectificación (Art. 16)', 'Corregir datos inexactos o incompletos.'],
            ['Supresión (Art. 17)', 'Solicitar el borrado de tus datos («derecho al olvido»).'],
            ['Limitación (Art. 18)', 'Restringir el tratamiento en determinadas circunstancias.'],
            ['Portabilidad (Art. 20)', 'Recibir tus datos en formato estructurado y legible por máquina (CSV disponible en Ajustes).'],
            ['Oposición (Art. 21)', 'Oponerte al tratamiento basado en interés legítimo.'],
            ['Retirar consentimiento', 'Retirar tu consentimiento en cualquier momento desde Ajustes → RGPD, sin que afecte a la licitud del tratamiento anterior.'],
            ['Reclamación', 'Presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en aepd.es.'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border bg-muted/30 p-2.5 space-y-0.5">
              <p className="font-semibold text-xs">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Para ejercer cualquiera de estos derechos, contacta a <span className="font-mono">c.gutierrez.con@gmail.com</span> indicando
          el derecho que deseas ejercer y tu identificación.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">8. Decisiones automatizadas y elaboración de perfiles</h3>
        <p>
          Axiom genera perfiles de comportamiento y cálculos automatizados (estado del sistema, biomarcadores, alertas).
          Estos cálculos son exclusivamente para uso personal del propio usuario y no producen efectos jurídicos
          ni afectan significativamente al usuario de forma similar a lo previsto en el Art. 22 RGPD.
          El usuario puede desactivar o ignorar cualquier recomendación del sistema.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">9. Seguridad</h3>
        <p>
          Los datos están protegidos mediante las medidas de seguridad de Firebase (cifrado en tránsito con TLS,
          cifrado en reposo, reglas de seguridad de Firestore que garantizan que cada usuario solo accede a sus
          propios datos). No se almacenan datos de pago ni credenciales sensibles fuera de los sistemas de Google.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">10. Cookies y almacenamiento local</h3>
        <p>
          Axiom utiliza <strong>localStorage</strong> y <strong>IndexedDB</strong> del navegador para almacenar
          tokens de sesión de Firebase y preferencias locales. No se utilizan cookies de terceros con fines
          publicitarios o de seguimiento. Las cookies de sesión de Firebase son estrictamente necesarias para
          el funcionamiento del servicio.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="font-bold text-base">11. Modificaciones de la política</h3>
        <p>
          Esta política puede actualizarse para reflejar cambios en el servicio o en la legislación aplicable.
          La versión actual es <strong>v{PRIVACY_POLICY_VERSION}</strong> ({PRIVACY_POLICY_DATE}). Los cambios
          materiales se notificarán dentro de la aplicación y requerirán una nueva aceptación.
        </p>
      </section>

    </div>
  );
}

interface PrivacyPolicyDialogProps {
  trigger: React.ReactNode;
}

export function PrivacyPolicyDialog({ trigger }: PrivacyPolicyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">Política de Privacidad</DialogTitle>
            <Badge variant="outline" className="text-[10px] font-mono">v{PRIVACY_POLICY_VERSION}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Última actualización: {PRIVACY_POLICY_DATE} · Reglamento (UE) 2016/679 (RGPD)</p>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <PrivacyPolicyContent />
          <div className="h-6" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
