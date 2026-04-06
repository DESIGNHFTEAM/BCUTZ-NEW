import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
const CookiePolicy = () => {
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
            <h1 className="text-4xl font-bold mb-8">{t('legal.cookies.title')}</h1>
            <p className="text-muted-foreground mb-8">
              {t('legal.cookies.lastUpdated')}
            </p>

            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.intro.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.intro.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.what.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.what.content')}
                </p>
                <p className="text-muted-foreground mt-4">
                  {t('legal.cookies.sections.what.similar')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.cookies.sections.what.localStorage')}</strong> {t('legal.cookies.sections.what.localStorageDesc')}</li>
                  <li><strong>{t('legal.cookies.sections.what.sessionStorage')}</strong> {t('legal.cookies.sections.what.sessionStorageDesc')}</li>
                  <li><strong>{t('legal.cookies.sections.what.pixels')}</strong> {t('legal.cookies.sections.what.pixelsDesc')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.types.title')}</h2>

                <h3 className="text-xl font-medium mb-3">{t('legal.cookies.sections.types.necessary.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.types.necessary.content')}
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.cookies.sections.types.functional.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.types.functional.content')}
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.cookies.sections.types.analytics.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.types.analytics.content')}
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.cookies.sections.types.marketing.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.types.marketing.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.consent.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.consent.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li><strong>{t('legal.cookies.sections.consent.necessary')}</strong> {t('legal.cookies.sections.consent.necessaryDesc')}</li>
                  <li><strong>{t('legal.cookies.sections.consent.other')}</strong> {t('legal.cookies.sections.consent.otherDesc')}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  {t('legal.cookies.sections.consent.banner')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.managing.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.managing.intro')}
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.cookies.sections.managing.settings.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.managing.settings.content')}
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">{t('legal.cookies.sections.managing.browser.title')}</h3>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.managing.browser.content')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.cookies.sections.managing.browser.item1')}</li>
                  <li>{t('legal.cookies.sections.managing.browser.item2')}</li>
                  <li>{t('legal.cookies.sections.managing.browser.item3')}</li>
                  <li>{t('legal.cookies.sections.managing.browser.item4')}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  {t('legal.cookies.sections.managing.browser.note')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.thirdParty.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.thirdParty.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.dataProtection.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.dataProtection.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
                  <li>{t('legal.cookies.sections.dataProtection.item1')}</li>
                  <li>{t('legal.cookies.sections.dataProtection.item2')}</li>
                  <li>{t('legal.cookies.sections.dataProtection.item3')}</li>
                  <li>{t('legal.cookies.sections.dataProtection.item4')}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.updates.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.updates.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">{t('legal.cookies.sections.contact.title')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.cookies.sections.contact.intro')}
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

export default CookiePolicy;