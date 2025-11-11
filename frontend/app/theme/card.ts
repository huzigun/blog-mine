export default {
  slots: {
    root: 'rounded-xl overflow-hidden',
    header: 'p-4 sm:px-5',
    body: 'p-4 sm:p-5',
    footer: 'p-4 sm:px-5',
  },
  variants: {
    variant: {
      solid: {
        root: 'bg-inverted text-inverted',
      },
      outline: {
        root: 'bg-default ring ring-default divide-y divide-slate-200/60',
      },
      soft: {
        root: 'bg-elevated/50 divide-y divide-slate-200/60',
      },
      subtle: {
        root: 'bg-elevated/50 ring ring-default divide-y divide-slate-200/60',
      },
      shadow: {
        root: 'bg-default shadow-[rgba(10, 10, 10, 0.04) 0px 0.125rem 0px] divide-y divide-slate-200/60',
      },
    },
  },
  defaultVariants: {
    variant: 'shadow',
  },
};
