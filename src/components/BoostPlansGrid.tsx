import React from 'react';
import { Check, Sparkles, Crown, Zap, Star, Flame } from 'lucide-react';
import { BOOST_PLANS } from '../lib/boostPlans';
import type { BoostPlan, BoostPlanId } from '../types';

interface BoostPlansGridProps {
  selectedPlanId: BoostPlanId | null;
  onSelectPlan: (plan: BoostPlan) => void;
  compact?: boolean;
}

const PLAN_ICONS: Record<BoostPlanId, React.ComponentType<{ className?: string }>> = {
  decouverte: Zap,
  standard: Sparkles,
  premium: Flame,
  pro: Star,
  vip: Crown,
};

export const BoostPlansGrid: React.FC<BoostPlansGridProps> = ({
  selectedPlanId,
  onSelectPlan,
  compact = false,
}) => {
  return (
    <div
      className={
        compact
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-stretch'
      }
    >
      {BOOST_PLANS.map((plan) => {
        const Icon = PLAN_ICONS[plan.id];
        const isSelected = selectedPlanId === plan.id;
        const isPopular = Boolean(plan.isPopular);

        return (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-150 border ${
              isPopular
                ? isSelected
                  ? 'bg-slate-900 text-white border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                  : 'bg-slate-900 text-white border-emerald-500/70 shadow-md'
                : isSelected
                ? 'bg-emerald-50/70 text-slate-900 border-emerald-600 ring-2 ring-emerald-500/25 shadow-sm'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              {/* Kicker row */}
              <div className="flex items-center justify-between gap-2 mb-2.5 min-h-[20px]">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isPopular
                        ? 'text-amber-400'
                        : isSelected
                        ? 'text-emerald-600'
                        : 'text-slate-500'
                    }`}
                  />
                  <h5
                    className={`text-sm font-bold tracking-tight ${
                      isPopular ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {plan.name}
                  </h5>
                </div>

                {isPopular && (
                  <span className="text-[11px] font-bold text-amber-300 whitespace-nowrap shrink-0">
                    Offre populaire
                  </span>
                )}
              </div>

              {/* Price & Duration */}
              <div className="pb-3 mb-3 border-b border-current/10">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-extrabold font-mono tabular-nums tracking-tight ${
                      isPopular ? 'text-white' : 'text-slate-950'
                    }`}
                  >
                    {plan.priceFCFA.toLocaleString('fr-FR')}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isPopular ? 'text-emerald-400' : 'text-emerald-700'
                    }`}
                  >
                    FCFA
                  </span>
                </div>
                <div
                  className={`text-xs font-medium mt-0.5 ${
                    isPopular ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  Durée : {plan.durationLabel}
                </div>
              </div>

              {/* Benefits */}
              <ul className="space-y-2 mb-4">
                {plan.benefits.map((benefit, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 text-xs leading-snug ${
                      isPopular ? 'text-slate-200' : 'text-slate-600'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isPopular ? 'text-emerald-400' : 'text-emerald-600'
                      }`}
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => onSelectPlan(plan)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
                isSelected
                  ? isPopular
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : isPopular
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Offre sélectionnée</span>
                </>
              ) : (
                <span>Choisir cette offre</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
