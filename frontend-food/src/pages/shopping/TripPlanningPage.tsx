/**
 * TripPlanningPage – "Einkäufe planen" of an event: trips with shop and time, the demand of all meal plans
 * distributed over them by date, manual moves as rules, and demand no trip covers.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCreateRule, useCreateTrip, useDeleteRule, useDeleteTrip, useMaterializeTrip, useTripPlan, useUpdateTrip } from '@/api/shoppingTrips';
import { useCurrentUser } from '@/api/auth';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorDisplay from '@/components/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import UnauthGate from '@/components/shared/UnauthGate';
import MoveAllocationDialog from '@/components/shopping/trips/MoveAllocationDialog';
import TripCard from '@/components/shopping/trips/TripCard';
import TripFormDialog, { type TripFormValues } from '@/components/shopping/trips/TripFormDialog';
import UncoveredSection from '@/components/shopping/trips/UncoveredSection';
import { Button } from '@/components/ui/button';
import { SkeletonCardGrid } from '@/components/ui/skeleton';
import { notify } from '@/lib/notify';
import type { AllocationRule, PlannedTrip, TripRow } from '@/schemas/shoppingTrip';

type TripDialog = { mode: 'create' } | { mode: 'edit'; trip: PlannedTrip };

export default function TripPlanningPage() {
  const { eventSlug = '' } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedTrip = Number(searchParams.get('trip')) || null;

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const plan = useTripPlan(eventSlug, !!user);
  const createTrip = useCreateTrip(eventSlug);
  const updateTrip = useUpdateTrip(eventSlug);
  const deleteTrip = useDeleteTrip(eventSlug);
  const materialize = useMaterializeTrip(eventSlug);
  const createRule = useCreateRule(eventSlug);
  const deleteRule = useDeleteRule(eventSlug);

  const [tripDialog, setTripDialog] = useState<TripDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlannedTrip | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ trip: PlannedTrip; row: TripRow } | null>(null);

  const selectedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (selectedTrip !== null && plan.data) selectedRef.current?.scrollIntoView?.({ block: 'start' });
  }, [selectedTrip, plan.data]);

  const ruleNames = useMemo(
    () => Object.fromEntries((plan.data?.rules ?? []).map((rule) => [rule.id, rule.name])),
    [plan.data?.rules],
  );

  if (userLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-8 lg:px-8">
        <SkeletonCardGrid count={3} withImage={false} label="Einkäufe werden geladen" className="lg:grid-cols-1" />
      </div>
    );
  }
  if (!user) {
    return <UnauthGate title="Einkäufe planen" description="Melde dich an, um deine Einkaufslisten zu sehen." />;
  }

  const data = plan.data;
  const canManage = data?.can_manage ?? false;

  const saveTrip = (values: TripFormValues) => {
    if (tripDialog?.mode === 'edit') {
      updateTrip.mutate(
        { listId: tripDialog.trip.list_id, ...values },
        {
          onSuccess: () => {
            notify.success('Einkauf gespeichert');
            setTripDialog(null);
          },
        },
      );
      return;
    }
    createTrip.mutate(values, {
      onSuccess: () => {
        notify.success('Einkauf angelegt');
        setTripDialog(null);
      },
    });
  };

  const freeze = (trip: PlannedTrip) => {
    materialize.mutate(trip.list_id, {
      onSuccess: () => {
        notify.success('Liste erstellt');
        navigate(`/shopping-lists/${trip.list_id}`);
      },
      onError: (error) => notify.error('Liste konnte nicht erstellt werden', { error }),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTrip.mutate(deleteTarget.list_id, {
      onSuccess: () => {
        notify.success('Einkauf gelöscht');
        setDeleteTarget(null);
      },
      onError: (error) => {
        notify.error('Einkauf konnte nicht gelöscht werden', { error });
        setDeleteTarget(null);
      },
    });
  };

  const removeRule = (rule: AllocationRule) => {
    deleteRule.mutate(rule.id, {
      onSuccess: () => notify.success('Zuordnung zurückgenommen'),
      onError: (error) => notify.error('Zuordnung konnte nicht zurückgenommen werden', { error }),
    });
  };

  const deleteTitle =
    deleteTarget?.status === 'created'
      ? `Einkauf mit ${deleteTarget.checked_count} abgehakten Einträgen löschen?`
      : `Einkauf „${deleteTarget?.name ?? ''}“ löschen?`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 font-sans sm:px-6 md:py-8 lg:px-8">
      <PageHeader
        title={data?.event_name ?? 'Einkäufe planen'}
        description="Einkäufe planen: Der Bedarf aller Essenspläne wird nach Datum auf die Einkäufe verteilt."
        breadcrumbs={[
          { label: 'Startseite', to: '/' },
          { label: 'Einkaufslisten', to: '/shopping-lists' },
          { label: 'Einkäufe planen' },
        ]}
        countLoading={plan.isPending}
        count={data?.trips.length}
        countLabel={{ one: 'Einkauf', other: 'Einkäufe' }}
        actions={
          canManage ? (
            <Button variant="secondary" onClick={() => setTripDialog({ mode: 'create' })}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Einkauf hinzufügen
            </Button>
          ) : undefined
        }
      />

      {plan.isPending ? (
        <SkeletonCardGrid count={3} withImage={false} label="Einkäufe werden geladen" className="lg:grid-cols-1" />
      ) : plan.isError || !data ? (
        <ErrorDisplay error={plan.error} title="Einkäufe konnten nicht geladen werden" onRetry={() => void plan.refetch()} />
      ) : (
        <div className="space-y-4">
          {!canManage && (
            <p role="note" className="rounded-xl bg-info-soft px-4 py-3 text-body text-info shadow-soft">
              Du kannst den Einkaufsplan nur lesen. Änderungen sind dem Event-Team vorbehalten.
            </p>
          )}

          <UncoveredSection uncovered={data.uncovered} hints={data.hints} ruleNames={ruleNames} />

          {data.trips.length === 0 ? (
            <EmptyState
              icon="shopping_cart"
              title="Noch kein Einkauf geplant"
              description="Lege einen Einkauf mit Laden und Zeitpunkt an. Der Bedarf der Essenspläne wird dann automatisch verteilt."
              ctaLabel={canManage ? 'Einkauf hinzufügen' : undefined}
              onCtaClick={canManage ? () => setTripDialog({ mode: 'create' }) : undefined}
            />
          ) : (
            <div className="stagger space-y-4">
              {data.trips.map((trip) => (
                <TripCard
                  key={trip.list_id}
                  ref={trip.list_id === selectedTrip ? selectedRef : undefined}
                  trip={trip}
                  rules={data.rules}
                  canManage={canManage}
                  highlighted={trip.list_id === selectedTrip}
                  busy={materialize.isPending}
                  onEdit={(target) => setTripDialog({ mode: 'edit', trip: target })}
                  onDelete={setDeleteTarget}
                  onMaterialize={freeze}
                  onMove={(source, row) => setMoveTarget({ trip: source, row })}
                  onRemoveRule={removeRule}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TripFormDialog
        open={tripDialog !== null}
        onOpenChange={(open) => !open && setTripDialog(null)}
        eventSlug={eventSlug}
        initial={
          tripDialog?.mode === 'edit'
            ? {
                store: tripDialog.trip.store_id !== null ? { id: tripDialog.trip.store_id, name: tripDialog.trip.store_name } : null,
                scheduledAt: tripDialog.trip.scheduled_at,
                name: tripDialog.trip.name,
              }
            : undefined
        }
        pending={createTrip.isPending || updateTrip.isPending}
        error={tripDialog?.mode === 'edit' ? updateTrip.error : createTrip.error}
        onSubmit={saveTrip}
      />

      <MoveAllocationDialog
        row={moveTarget?.row ?? null}
        source={moveTarget?.trip ?? null}
        trips={data?.trips ?? []}
        pending={createRule.isPending}
        error={createRule.error}
        onClose={() => {
          setMoveTarget(null);
          createRule.reset();
        }}
        onSubmit={(input) =>
          createRule.mutate(input, {
            onSuccess: () => {
              notify.success('Zuordnung gespeichert');
              setMoveTarget(null);
            },
          })
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={deleteTitle}
        description={
          deleteTarget?.status === 'created'
            ? 'Die Liste und alle Einträge werden unwiderruflich gelöscht. Der Bedarf wird neu verteilt.'
            : 'Der Bedarf dieses Einkaufs wird auf die übrigen Einkäufe verteilt.'
        }
        confirmLabel="Löschen"
        loading={deleteTrip.isPending}
      />
    </div>
  );
}
