import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useApp } from '../context/AppContext';
import { BoostPlansGrid } from './BoostPlansGrid';
import {
  getBoostPlan,
  isListingBoostActive,
  getBoostRemainingLabel,
} from '../lib/boostPlans';
import { auth, db, functions } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import type { BoostPaymentMethod, BoostPlan, BoostPlanId } from '../types';

export const BoostCheckoutModal: React.FC = () => {
  const {
    boostCheckoutListing,
    boostCheckoutInitialPlan,
    closeBoostCheckout,
    applyConfirmedBoost,
    currentUser,
    openAuthModal,
    showToast,
  } = useApp();

  const [selectedPlanId, setSelectedPlanId] = useState<BoostPlanId>(
    boostCheckoutInitialPlan || 'premium'
  );
  const [paymentMethod, setPaymentMethod] = useState<BoostPaymentMethod>('wave');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    paymentId: string;
    paydunyaToken: string;
    checkoutUrl: string;
    amountFCFA: number;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'pending' | 'completed' | 'failed' | 'cancelled'
  >('idle');

  useEffect(() => {
    setSelectedPlanId(boostCheckoutInitialPlan || 'premium');
    setCheckoutData(null);
    setPaymentStatus('idle');
    setErrorMsg(null);
  }, [boostCheckoutListing?.id, boostCheckoutInitialPlan]);

  const verifyPaymentWithServer = useCallback(
    async (paymentId: string, silent = false) => {
      if (!auth.currentUser) return;
      if (!silent) setIsConfirming(true);
      try {
        const useCloudFn = import.meta.env.VITE_USE_FIREBASE_FUNCTIONS === 'true';
        let result: {
          confirmed?: boolean;
          status?: string;
          listingId?: string;
          planId?: BoostPlanId;
          planName?: string;
          priority?: number;
          boostStartedAt?: string;
          boostExpiresAt?: string;
          error?: string;
        };

        if (useCloudFn) {
          const callable = httpsCallable<{ paymentId: string }, typeof result>(
            functions,
            'confirmBoostPayment'
          );
          const fnRes = await callable({ paymentId });
          result = fnRes.data;
        } else {
          const idToken = await auth.currentUser.getIdToken();
          const resp = await fetch('/api/boost/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ paymentId }),
          });
          result = await resp.json();
          if (!resp.ok) {
            throw new Error(result.error || 'Vérification PayDunya impossible.');
          }
        }

        if (result.confirmed && result.listingId && result.planId) {
          setPaymentStatus('completed');
          applyConfirmedBoost(result.listingId, {
            planId: result.planId,
            planName: result.planName || getBoostPlan(result.planId).name,
            priority: result.priority || getBoostPlan(result.planId).priority,
            boostStartedAt: result.boostStartedAt || new Date().toISOString(),
            boostExpiresAt: result.boostExpiresAt || '',
            paymentId,
          });
          showToast(
            `Boost ${result.planName || ''} activé après confirmation PayDunya !`,
            'success'
          );
        } else if (!silent) {
          const st = (result.status || 'pending') as
            | 'pending'
            | 'failed'
            | 'cancelled';
          if (st === 'failed' || st === 'cancelled') {
            setPaymentStatus(st);
            setErrorMsg(
              'Le paiement n’a pas été finalisé sur PayDunya. Aucun Boost activé.'
            );
          } else {
            showToast(
              'Paiement en attente de confirmation officielle PayDunya.',
              'info'
            );
          }
        }
      } catch (err) {
        if (!silent) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Erreur lors de la vérification du paiement.'
          );
        }
      } finally {
        if (!silent) setIsConfirming(false);
      }
    },
    [applyConfirmedBoost, showToast]
  );

  // Real-time Firestore listener on boostPayments/{paymentId} so IPN webhook updates UI immediately
  useEffect(() => {
    if (!checkoutData?.paymentId || !auth.currentUser) return;
    const path = `boostPayments/${checkoutData.paymentId}`;
    const unsubscribe = onSnapshot(
      doc(db, 'boostPayments', checkoutData.paymentId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        if (data.status === 'completed' && data.activated === true) {
          const planId = (data.planId as BoostPlanId) || selectedPlanId;
          const plan = getBoostPlan(planId);
          setPaymentStatus('completed');
          applyConfirmedBoost(String(data.listingId), {
            planId,
            planName: plan.name,
            priority: plan.priority,
            boostStartedAt: String(data.boostStartedAt || new Date().toISOString()),
            boostExpiresAt: String(data.boostExpiresAt || ''),
            paymentId: checkoutData.paymentId,
          });
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentStatus(data.status as 'failed' | 'cancelled');
        }
      },
      (error) => {
        // Only log permission/network errors via structured handler without crashing modal
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Handled via error logging
        }
      }
    );

    const pollInterval = window.setInterval(() => {
      if (paymentStatus === 'pending') {
        void verifyPaymentWithServer(checkoutData.paymentId, true);
      }
    }, 6000);

    return () => {
      unsubscribe();
      window.clearInterval(pollInterval);
    };
  }, [
    checkoutData?.paymentId,
    paymentStatus,
    selectedPlanId,
    applyConfirmedBoost,
    verifyPaymentWithServer,
  ]);

  if (!boostCheckoutListing) return null;

  const selectedPlan = getBoostPlan(selectedPlanId);
  const alreadyActive = isListingBoostActive(boostCheckoutListing);

  const handleSelectPlan = (plan: BoostPlan) => {
    if (checkoutData) return;
    setSelectedPlanId(plan.id);
    setErrorMsg(null);
  };

  const handleStartPayDunyaCheckout = async () => {
    setErrorMsg(null);

    if (!currentUser || !auth.currentUser) {
      closeBoostCheckout();
      openAuthModal('login');
      showToast('Veuillez vous connecter avec Firebase pour payer un Boost.', 'info');
      return;
    }

    if (alreadyActive) {
      setErrorMsg(
        `Cette annonce possède déjà un Boost actif (${getBoostRemainingLabel(
          boostCheckoutListing.boostExpiresAt
        )}).`
      );
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const useCloudFn = import.meta.env.VITE_USE_FIREBASE_FUNCTIONS === 'true';
      let resData: {
        paymentId?: string;
        paydunyaToken?: string;
        checkoutUrl?: string;
        amountFCFA?: number;
        error?: string;
      };

      if (useCloudFn) {
        const callable = httpsCallable<
          {
            listingId: string;
            planId: BoostPlanId;
            paymentMethod: BoostPaymentMethod;
            returnBaseUrl: string;
          },
          typeof resData
        >(functions, 'createBoostCheckout');
        const fnRes = await callable({
          listingId: boostCheckoutListing.id,
          planId: selectedPlan.id,
          paymentMethod,
          returnBaseUrl: window.location.origin,
        });
        resData = fnRes.data;
      } else {
        const idToken = await auth.currentUser.getIdToken();
        const resp = await fetch('/api/boost/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            listingId: boostCheckoutListing.id,
            planId: selectedPlan.id,
            paymentMethod,
          }),
        });
        resData = await resp.json();
        if (!resp.ok) {
          throw new Error(
            resData.error || 'Impossible de générer la facture PayDunya.'
          );
        }
      }

      if (!resData.paymentId || !resData.checkoutUrl || !resData.paydunyaToken) {
        throw new Error('Réponse PayDunya incomplète.');
      }

      setCheckoutData({
        paymentId: resData.paymentId,
        paydunyaToken: resData.paydunyaToken,
        checkoutUrl: resData.checkoutUrl,
        amountFCFA: resData.amountFCFA || selectedPlan.priceFCFA,
      });
      setPaymentStatus('pending');
      showToast(
        'Facture PayDunya prête ! Finalisez le paiement Wave / Orange Money.',
        'success'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la création de la transaction PayDunya.'
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Booster votre annonce sur SamaDeal
              </h3>
              <p className="text-xs text-slate-500">
                Paiement officiel Wave & Orange Money sécurisé par PayDunya
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeBoostCheckout}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Target Listing Summary */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={boostCheckoutListing.images[0]}
                alt={boostCheckoutListing.title}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {boostCheckoutListing.title}
                </h4>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-emerald-700 tabular-nums">
                    {boostCheckoutListing.price.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{boostCheckoutListing.city}</span>
                </div>
              </div>
            </div>

            {alreadyActive && (
              <div className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                Boost actif · {getBoostRemainingLabel(boostCheckoutListing.boostExpiresAt)}
              </div>
            )}
          </div>

          {paymentStatus === 'completed' ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-bold text-slate-900">
                Boost {selectedPlan.name} activé avec succès !
              </h4>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Votre paiement PayDunya de{' '}
                <strong className="font-mono">
                  {selectedPlan.priceFCFA.toLocaleString('fr-FR')} FCFA
                </strong>{' '}
                a été confirmé. Votre annonce affiche maintenant son badge et bénéficie
                de la priorité pendant {selectedPlan.durationLabel}.
              </p>
              <button
                type="button"
                onClick={closeBoostCheckout}
                className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Retourner aux annonces
              </button>
            </div>
          ) : (
            <>
              {/* 5 Boost Plans */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Choisissez votre formule Boost
                  </h4>
                  <span className="text-xs text-slate-500">
                    Montant et durée validés côté serveur
                  </span>
                </div>
                <BoostPlansGrid
                  selectedPlanId={selectedPlanId}
                  onSelectPlan={handleSelectPlan}
                />
              </div>

              {/* Payment Method + Checkout Actions */}
              {!checkoutData ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-100">
                  <div className="lg:col-span-7 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Choisissez votre moyen de paiement via PayDunya
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('wave')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          paymentMethod === 'wave'
                            ? 'border-[#1DA1F2] bg-sky-50 ring-2 ring-sky-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">
                            Wave Sénégal
                          </span>
                          {paymentMethod === 'wave' && (
                            <CheckCircle2 className="w-4 h-4 text-[#1DA1F2]" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Paiement instantané via Wave & PayDunya
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('orange_money')}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          paymentMethod === 'orange_money'
                            ? 'border-[#FF7900] bg-orange-50 ring-2 ring-orange-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">
                            Orange Money
                          </span>
                          {paymentMethod === 'orange_money' && (
                            <CheckCircle2 className="w-4 h-4 text-[#FF7900]" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Validation OM sécurisée via PayDunya
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Formule choisie</span>
                        <span className="font-bold text-slate-900">
                          {selectedPlan.name} ({selectedPlan.durationLabel})
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Opérateur</span>
                        <span className="font-semibold text-slate-900">
                          {paymentMethod === 'wave' ? 'Wave Sénégal' : 'Orange Money'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                        <span className="font-bold text-slate-900">Total officiel</span>
                        <span className="text-lg font-extrabold font-mono text-emerald-700 tabular-nums">
                          {selectedPlan.priceFCFA.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCreatingInvoice || alreadyActive}
                      onClick={handleStartPayDunyaCheckout}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>
                        {isCreatingInvoice
                          ? 'Création de la facture PayDunya...'
                          : `Payer ${selectedPlan.priceFCFA.toLocaleString('fr-FR')} FCFA via PayDunya`}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Official PayDunya Checkout Link & Confirmation */
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Facture PayDunya prête — Réf.{' '}
                        <span className="font-mono text-emerald-700">
                          {checkoutData.paymentId}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Réglez exactement{' '}
                        <strong className="font-mono">
                          {checkoutData.amountFCFA.toLocaleString('fr-FR')} FCFA
                        </strong>{' '}
                        sur la page officielle PayDunya. Votre Boost s’activera
                        automatiquement dès confirmation.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg shrink-0">
                      En attente PayDunya
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <a
                      href={checkoutData.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>
                        Ouvrir le paiement{' '}
                        {paymentMethod === 'wave' ? 'Wave' : 'Orange Money'} sur PayDunya
                      </span>
                    </a>

                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() =>
                        void verifyPaymentWithServer(checkoutData.paymentId, false)
                      }
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isConfirming ? 'animate-spin' : ''}`}
                      />
                      <span>Vérifier la confirmation</span>
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Protection anti-double paiement : un seul Boost actif autorisé par
                  annonce et montant vérifié côté serveur via PayDunya.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
