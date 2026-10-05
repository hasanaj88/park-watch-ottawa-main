import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ParkingLot = {
  id: string;
  name: string;
  capacity: number;
  available: number;
  status: string | null;
};

const OwnerDashboard = () => {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  useEffect(() => {
    const loadParkingLots = async () => {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }

      const { data, error: lotsError } = await supabase
        .from("parking_lots")
        .select("id, name, capacity, available, status")
        .eq("owner_id", userData.user.id);

      if (lotsError) {
        setError(lotsError.message);
        setLoading(false);
        return;
      }

      setLots(data ?? []);
      setLoading(false);
    };

    loadParkingLots();
  }, []);

const handleUpdateAvailable = async (
  lotId: string,
  currentAvailable: number
) => {
  setUpdatingId(lotId);
  setUpdateMessage("");

  const newAvailable = currentAvailable + 1;

  const { error: updateError } = await supabase
    .from("parking_lots")
    .update({
      available: newAvailable,
    })
    .eq("id", lotId);

  if (updateError) {
    setUpdateMessage(`Update failed: ${updateError.message}`);
    setUpdatingId(null);
    return;
  }

  setLots((currentLots) =>
    currentLots.map((lot) =>
      lot.id === lotId
        ? { ...lot, available: newAvailable }
        : lot
    )
  );

  setUpdateMessage("Update successful ✓");
  setUpdatingId(null);
};


  if (loading) {
    return (
      <main className="p-6">
        <p>Loading your parking lots...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">
        Parking Owner Dashboard
      </h1>

      <p className="mt-2 text-muted-foreground">
        Manage your parking locations.
      </p>

      {error && (
        <p className="mt-6 text-destructive">
          {error}
        </p>
      )}

      {!error && lots.length === 0 && (
        <p className="mt-6">
          No parking lots are assigned to your account.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {lots.map((lot) => (
          <div
            key={lot.id}
            className="rounded-lg border p-4"
          >
            <h2 className="text-lg font-semibold">
              {lot.name}
            </h2>

            <p>Capacity: {lot.capacity}</p>
            <p>Available: {lot.available}</p>
            <p>Status: {lot.status ?? "Unknown"}</p>
            <button
             type="button"
             className="mt-4 rounded-md border px-4 py-2"
             disabled={updatingId === lot.id}
             onClick={() =>
                 handleUpdateAvailable(lot.id, lot.available)
                       }
                >
  {updatingId === lot.id
    ? "Updating..."
    : "Test Update (+1 Available)"}
</button>
          </div>
        ))}
      </div>
   {updateMessage && (
  <p className="mt-4">
    {updateMessage}
  </p>
)}
    </main>
  );
};

export default OwnerDashboard;