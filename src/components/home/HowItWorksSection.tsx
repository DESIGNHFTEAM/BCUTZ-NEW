import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, CalendarCheck, Scissors, ThumbsUp } from 'lucide-react';

// Use tuple type for cubic bezier easing
const customEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 80,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.7,
      ease: customEase,
    },
  },
};

const numberVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.5,
  },
  visible: {
    opacity: 0.12,
    scale: 1,
    transition: { 
      duration: 0.8,
      ease: customEase,
    },
  },
};

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: {
      duration: 1,
      ease: customEase,
      delay: 0.5,
    },
  },
};

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: Search,
      number: '01',
      title: t('howItWorks.step1Title'),
      description: t('howItWorks.step1Desc'),
    },
    {
      icon: CalendarCheck,
      number: '02',
      title: t('howItWorks.step2Title'),
      description: t('howItWorks.step2Desc'),
    },
    {
      icon: Scissors,
      number: '03',
      title: t('howItWorks.step3Title'),
      description: t('howItWorks.step3Desc'),
    },
    {
      icon: ThumbsUp,
      number: '04',
      title: t('howItWorks.step4Title'),
      description: t('howItWorks.step4Desc'),
    },
  ];

  return (
    <section className="py-32 bg-background relative overflow-hidden">
      {/* Subtle Grid Pattern */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.025 }}
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
            className="text-foreground/85 text-sm tracking-widest uppercase block"
          >
            {t('howItWorks.simpleProcess')}
          </motion.span>
          
          <motion.div
            variants={lineVariants}
            className="w-16 h-[2px] bg-foreground mx-auto my-6 origin-center"
          />
          
          <motion.h2
            variants={itemVariants}
            className="font-display text-foreground text-5xl md:text-6xl lg:text-7xl mb-6 tracking-wider"
          >
            {t('howItWorks.title')}
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-foreground/80 text-lg max-w-xl mx-auto"
          >
            {t('howItWorks.subtitle')}
          </motion.p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative group text-center"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <motion.div 
                  variants={lineVariants}
                  className="hidden lg:block absolute top-16 left-[60%] w-full h-[1px] bg-border origin-left" 
                />
              )}
              
              {/* Number */}
              <motion.div 
                variants={numberVariants}
              className="text-8xl font-display text-foreground/15 mb-4 select-none"
              >
                {step.number}
              </motion.div>
              
              {/* Icon */}
              <div 
                className="inline-flex items-center justify-center w-16 h-16 border-2 border-foreground mb-6 group-hover:bg-foreground group-hover:scale-110 group-hover:rotate-[5deg] transition-all duration-200"
              >
                <step.icon className="w-8 h-8 text-foreground group-hover:text-background transition-colors duration-200" />
              </div>
              
              <h3 className="font-display text-foreground text-xl tracking-wider mb-3">{step.title}</h3>
              <p className="text-foreground/85 text-sm">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
