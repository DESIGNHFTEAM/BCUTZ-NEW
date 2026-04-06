import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
<main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-8">{t('legal.privacy.title')}</h1>
            <p className="text-muted-foreground mb-8">
              {t('legal.privacy.lastUpdated')}
            </p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.intro.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.intro.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.controller.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.controller.intro')}
                </p>
                <div className="mt-4 text-muted-foreground">
                  <p><strong>BCUTZ</strong></p>
                  <p>Schulhausstrasse 15</p>
                  <p>1713 St. Antoni, Fribourg, Switzerland</p>
                  <p>Email: team@bcutz.com</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.dataCollected.title')}</h2>
                
                <h3 className="text-xl font-medium mb-3">{t('legal.privacy.sections.dataCollected.provided.title')}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>{t('legal.privacy.sections.dataCollected.provided.account')}</strong> {t('legal.privacy.sections.dataCollected.provided.accountDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.provided.payment')}</strong> {t('legal.privacy.sections.dataCollected.provided.paymentDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.provided.barberProfile')}</strong> {t('legal.privacy.sections.dataCollected.provided.barberProfileDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.provided.booking')}</strong> {t('legal.privacy.sections.dataCollected.provided.bookingDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.provided.communications')}</strong> {t('legal.privacy.sections.dataCollected.provided.communicationsDesc')}</li>
                </ul>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.privacy.sections.dataCollected.automatic.title')}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>{t('legal.privacy.sections.dataCollected.automatic.device')}</strong> {t('legal.privacy.sections.dataCollected.automatic.deviceDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.automatic.usage')}</strong> {t('legal.privacy.sections.dataCollected.automatic.usageDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.automatic.location')}</strong> {t('legal.privacy.sections.dataCollected.automatic.locationDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataCollected.automatic.cookies')}</strong> {t('legal.privacy.sections.dataCollected.automatic.cookiesDesc')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.legalBasis.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.legalBasis.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.privacy.sections.legalBasis.contract')}</strong> {t('legal.privacy.sections.legalBasis.contractDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.legalBasis.legitimate')}</strong> {t('legal.privacy.sections.legalBasis.legitimateDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.legalBasis.legal')}</strong> {t('legal.privacy.sections.legalBasis.legalDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.legalBasis.consent')}</strong> {t('legal.privacy.sections.legalBasis.consentDesc')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.howWeUse.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.howWeUse.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.privacy.sections.howWeUse.item1')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item2')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item3')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item4')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item5')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item6')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item7')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item8')}</li>
                  <li>{t('legal.privacy.sections.howWeUse.item9')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.dataSharing.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.dataSharing.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.privacy.sections.dataSharing.users')}</strong> {t('legal.privacy.sections.dataSharing.usersDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataSharing.payment')}</strong> {t('legal.privacy.sections.dataSharing.paymentDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataSharing.cloud')}</strong> {t('legal.privacy.sections.dataSharing.cloudDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataSharing.analytics')}</strong> {t('legal.privacy.sections.dataSharing.analyticsDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.dataSharing.legal')}</strong> {t('legal.privacy.sections.dataSharing.legalDesc')}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  {t('legal.privacy.sections.dataSharing.noSelling')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.retention.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.retention.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.privacy.sections.retention.account')}</strong> {t('legal.privacy.sections.retention.accountDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.retention.transactions')}</strong> {t('legal.privacy.sections.retention.transactionsDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.retention.marketing')}</strong> {t('legal.privacy.sections.retention.marketingDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.retention.analytics')}</strong> {t('legal.privacy.sections.retention.analyticsDesc')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.rights.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.rights.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.privacy.sections.rights.access')}</strong> {t('legal.privacy.sections.rights.accessDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.rights.rectification')}</strong> {t('legal.privacy.sections.rights.rectificationDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.rights.erasure')}</strong> {t('legal.privacy.sections.rights.erasureDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.rights.restriction')}</strong> {t('legal.privacy.sections.rights.restrictionDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.rights.portability')}</strong> {t('legal.privacy.sections.rights.portabilityDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.rights.object')}</strong> {t('legal.privacy.sections.rights.objectDesc')}</li>
                  <li><strong>{t('legal.privacy.sections.rights.withdraw')}</strong> {t('legal.privacy.sections.rights.withdrawDesc')}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  {t('legal.privacy.sections.rights.howTo')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.security.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.security.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.privacy.sections.security.item1')}</li>
                  <li>{t('legal.privacy.sections.security.item2')}</li>
                  <li>{t('legal.privacy.sections.security.item3')}</li>
                  <li>{t('legal.privacy.sections.security.item4')}</li>
                  <li>{t('legal.privacy.sections.security.item5')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.children.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.children.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.changes.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.changes.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.sections.contact.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.privacy.sections.contact.intro')}
                </p>
                <div className="mt-4 text-muted-foreground">
                  <p>Email: team@bcutz.com</p>
                  <p>Address: BCUTZ, Schulhausstrasse 15, 1713 St. Antoni, Fribourg, Switzerland</p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
</div>
  );
};

export default PrivacyPolicy;