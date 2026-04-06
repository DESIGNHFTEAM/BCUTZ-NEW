import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const TermsOfService = () => {
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
            <h1 className="text-4xl font-bold mb-8">{t('legal.terms.title')}</h1>
            <p className="text-muted-foreground mb-8">
              {t('legal.terms.lastUpdated')}
            </p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.intro.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.intro.p1')}
                </p>
                <p className="text-muted-foreground mt-4">
                  {t('legal.terms.sections.intro.p2')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.definitions.title')}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>{t('legal.terms.sections.definitions.customer')}</strong> {t('legal.terms.sections.definitions.customerDesc')}</li>
                  <li><strong>{t('legal.terms.sections.definitions.barber')}</strong> {t('legal.terms.sections.definitions.barberDesc')}</li>
                  <li><strong>{t('legal.terms.sections.definitions.user')}</strong> {t('legal.terms.sections.definitions.userDesc')}</li>
                  <li><strong>{t('legal.terms.sections.definitions.services')}</strong> {t('legal.terms.sections.definitions.servicesDesc')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.eligibility.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.eligibility.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.account.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.account.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.terms.sections.account.item1')}</li>
                  <li>{t('legal.terms.sections.account.item2')}</li>
                  <li>{t('legal.terms.sections.account.item3')}</li>
                  <li>{t('legal.terms.sections.account.item4')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.platformServices.title')}</h2>
                <h3 className="text-xl font-medium mb-3">{t('legal.terms.sections.platformServices.forCustomers.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.platformServices.forCustomers.content')}
                </p>
                
                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.terms.sections.platformServices.forBarbers.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.platformServices.forBarbers.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.bookingsPayments.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.bookingsPayments.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.terms.sections.bookingsPayments.item1')}</li>
                  <li>{t('legal.terms.sections.bookingsPayments.item2')}</li>
                  <li>{t('legal.terms.sections.bookingsPayments.item3')}</li>
                  <li>{t('legal.terms.sections.bookingsPayments.item4')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.cancellation.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.cancellation.intro')}
                </p>
                
                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.terms.sections.cancellation.customerTitle')}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.terms.sections.cancellation.over48h')}</strong> {t('legal.terms.sections.cancellation.over48hDesc')}</li>
                  <li><strong>{t('legal.terms.sections.cancellation.24to48h')}</strong> {t('legal.terms.sections.cancellation.24to48hDesc')}</li>
                  <li><strong>{t('legal.terms.sections.cancellation.12to24h')}</strong> {t('legal.terms.sections.cancellation.12to24hDesc')}</li>
                  <li><strong>{t('legal.terms.sections.cancellation.under12h')}</strong> {t('legal.terms.sections.cancellation.under12hDesc')}</li>
                  <li><strong>{t('legal.terms.sections.cancellation.noShow')}</strong> {t('legal.terms.sections.cancellation.noShowDesc')}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  {t('legal.terms.sections.cancellation.platformFeeNote')}
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.terms.sections.cancellation.barberTitle')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.cancellation.barberIntro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.terms.sections.cancellation.barberItem1')}</li>
                  <li>{t('legal.terms.sections.cancellation.barberItem2')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.userConduct.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.userConduct.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.terms.sections.userConduct.item1')}</li>
                  <li>{t('legal.terms.sections.userConduct.item2')}</li>
                  <li>{t('legal.terms.sections.userConduct.item3')}</li>
                  <li>{t('legal.terms.sections.userConduct.item4')}</li>
                  <li>{t('legal.terms.sections.userConduct.item5')}</li>
                  <li>{t('legal.terms.sections.userConduct.item6')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.ip.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.ip.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.liability.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.liability.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.terms.sections.liability.item1')}</li>
                  <li>{t('legal.terms.sections.liability.item2')}</li>
                  <li>{t('legal.terms.sections.liability.item3')}</li>
                  <li>{t('legal.terms.sections.liability.item4')}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  {t('legal.terms.sections.liability.note')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.indemnification.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.indemnification.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.disputes.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.disputes.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.governingLaw.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.governingLaw.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.modifications.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.modifications.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.severability.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.severability.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.terms.sections.contact.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terms.sections.contact.intro')}
                </p>
                <div className="mt-4 text-muted-foreground">
                  <p><strong>BCUTZ</strong></p>
                  <p>Schulhausstrasse 15</p>
                  <p>1713 St. Antoni, Fribourg, Switzerland</p>
                  <p>Email: team@bcutz.com</p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
</div>
  );
};

export default TermsOfService;