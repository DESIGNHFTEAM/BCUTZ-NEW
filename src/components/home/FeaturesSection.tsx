import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Calendar, CreditCard, MapPin, Star, Clock, Shield } from 'lucide-react';

// Use tuple type for cubic bezier easing
const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.6,
      ease: customEase,
    },
  },
};

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.8,
      ease: customEase,
      delay: 0.3,
    },
  },
};

export function FeaturesSection() {
  const { t } = useTranslation();

  const features = [
    {
      icon: MapPin,
      title: t('features.findNearby'),
      description: t('features.findNearbyDesc'),
    },
    {
      icon: Calendar,
      title: t('features.easyBooking'),
      description: t('features.easyBookingDesc'),
    },
    {
      icon: CreditCard,
      title: t('features.securePayment'),
      description: t('features.securePaymentDesc'),
    },
    {
      icon: Star,
      title: t('features.verifiedReviews'),
      description: t('features.verifiedReviewsDesc'),
    },
    {
      icon: Clock,
      title: t('features.noWaiting'),
      description: t('features.noWaitingDesc'),
    },
    {
      icon: Shield,
      title: t('features.guaranteed'),
      description: t('features.guaranteedDesc'),
    },
  ];

  return (
    <section className="py-32 bg-card relative overflow-hidden">
      {/* Subtle Grid Pattern */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.02 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <motion.span
            variants={itemVariants}
            className="text-foreground/75 text-sm tracking-widest uppercase block"
          >
            {t('features.whyBcutz')}
          </motion.span>
          
          <motion.div
            variants={lineVariants}
            className="w-16 h-[2px] bg-foreground mx-auto my-6 origin-center"
          />
          
          <motion.h2
            variants={itemVariants}
            className="font-display text-foreground text-5xl md:text-6xl lg:text-7xl mb-6 tracking-wider"
          >
            {t('features.theSmartWay')}
            <br />
            {t('features.toBook')}
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-foreground/80 text-lg max-w-xl mx-auto"
          >
            {t('features.subtitle')}
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group p-10 bg-card cursor-pointer hover:bg-secondary transition-colors duration-300"
            >
              <div 
                className="w-14 h-14 border-2 border-foreground flex items-center justify-center mb-8 group-hover:bg-foreground group-hover:scale-105 transition-all duration-200"
              >
                <feature.icon className="w-7 h-7 text-foreground group-hover:text-background transition-colors duration-200" />
              </div>
              <h3 className="font-display text-foreground text-2xl tracking-wider mb-4">{feature.title}</h3>
              <p className="text-foreground/80">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
