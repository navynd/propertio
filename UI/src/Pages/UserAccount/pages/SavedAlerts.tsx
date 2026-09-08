import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  DownArrowIconBlack,
  ThreeDotIcon,
  RenamePencilIcon,
  TrashBinIcon,
  ModalCloseIcon,
} from "../../../Components/parts/icon";
import { CommonModal } from "../../../Components/parts/Modal";
import CreateAlertModal from "../../Search/components/CreateAlertModal";
import {
  getAlertFrequenciesMasterData,
  getListingTypesMasterData,
  getSearchAlerts,
  createSearchAlert,
  updateSearchAlert,
  deleteSearchAlert,
  deleteAllSearchAlerts,
  type NamedValueMaster,
  type SearchAlertListItem,
} from "../../../services/apiService";

const ALERTS_FETCH_LIMIT = 100;

function daysSince(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

function frequencyLabelFor(
  value: string,
  options: NamedValueMaster[]
): string {
  const v = value.trim().toLowerCase();
  const hit = options.find(
    (o) => String(o.value ?? "").trim().toLowerCase() === v
  );
  return hit?.name?.trim() || value;
}

function SavedAlerts() {
  const [alerts, setAlerts] = useState<SearchAlertListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [frequencyOptions, setFrequencyOptions] = useState<NamedValueMaster[]>([]);
  const [defaultListingTypeId, setDefaultListingTypeId] = useState<string | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const showToast = useCallback((message: string, severity: "success" | "error") => {
    setToast({ open: true, message, severity });
  }, []);

  const loadAlerts = useCallback(async (signal?: AbortSignal) => {
    setListLoading(true);
    setListError(null);
    try {
      const aggregated: SearchAlertListItem[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const resp = await getSearchAlerts({
          page,
          limit: ALERTS_FETCH_LIMIT,
          signal,
        });
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string" ? resp.message : "Failed to load alerts"
          );
        }
        const items = resp?.data?.items ?? [];
        if (Array.isArray(items)) aggregated.push(...items);
        const p = resp?.data?.pagination;
        totalPages =
          typeof p?.totalPages === "number" && Number.isFinite(p.totalPages) && p.totalPages >= 1
            ? p.totalPages
            : 1;
        page += 1;
      } while (page <= totalPages && !signal?.aborted);

      if (signal?.aborted) return;
      setAlerts(aggregated);
    } catch (e) {
      if (signal?.aborted) return;
      setListError(e instanceof Error ? e.message : "Something went wrong");
      setAlerts([]);
    } finally {
      if (!signal?.aborted) setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getAlertFrequenciesMasterData()
      .then((resp) => {
        if (!mounted) return;
        const list = resp.data?.alertFrequencies ?? [];
        setFrequencyOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (mounted) setFrequencyOptions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getListingTypesMasterData()
      .then((resp) => {
        if (!mounted) return;
        const items = (resp.data?.items ?? []).filter(
          (x) => String(x?._id ?? "").trim() && String(x?.name ?? "").trim()
        );
        setDefaultListingTypeId(items[0]?._id?.trim() ?? null);
      })
      .catch(() => {
        if (mounted) setDefaultListingTypeId(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadAlerts(ac.signal);
    return () => ac.abort();
  }, [loadAlerts]);

  const hasAlerts = alerts.length > 0;

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => String(a._id).localeCompare(String(b._id))),
    [alerts]
  );

  const toggleMenu = (id: string) => {
    setOpenId(null);
    setMenuOpenId((prev) => (prev === id ? null : id));
  };

  const handleToggle = (id: string) => {
    setMenuOpenId(null);
    setOpenId((prev) => (prev === id ? null : id));
  };

  const handleFrequencySelect = async (alertId: string, newValue: string) => {
    setOpenId(null);
    const current = alerts.find((a) => a._id === alertId);
    if (!current || current.frequency === newValue) return;

    const previous = alerts;
    setAlerts((prev) =>
      prev.map((a) => (a._id === alertId ? { ...a, frequency: newValue } : a))
    );

    try {
      const resp = await updateSearchAlert(alertId, { frequency: newValue });
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string" ? resp.message : "Update failed"
        );
      }
      if (resp?.data) {
        setAlerts((prev) =>
          prev.map((a) =>
            a._id === alertId
              ? {
                  ...a,
                  frequency: resp.data!.frequency,
                  alertName: resp.data!.alertName ?? a.alertName,
                  isActive: resp.data!.isActive,
                }
              : a
          )
        );
      }
      showToast(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "Alert frequency updated",
        "success"
      );
    } catch (err) {
      setAlerts(previous);
      showToast(err instanceof Error ? err.message : "Could not update frequency", "error");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const insideFrequency =
        target.closest(".pf-saved-alerts__custom-select") !== null;
      const insideMenu =
        target.closest(".pf-saved-alerts__custom-select__menu") !== null;

      if (!insideFrequency && !insideMenu) {
        setOpenId(null);
        setMenuOpenId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDeleteAlert = async () => {
    if (menuOpenId == null) return;
    const id = menuOpenId;
    setMenuOpenId(null);
    const previous = alerts;
    setAlerts((prev) => prev.filter((a) => a._id !== id));
    try {
      const resp = await deleteSearchAlert(id);
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string" ? resp.message : "Delete failed"
        );
      }
      showToast(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "Alert deleted",
        "success"
      );
    } catch (err) {
      setAlerts(previous);
      showToast(err instanceof Error ? err.message : "Could not delete alert", "error");
    }
  };

  const handleRenameStart = () => {
    if (menuOpenId == null) return;
    const current = alerts.find((a) => a._id === menuOpenId);
    if (!current) return;
    setRenameValue(current.alertName?.trim() || "");
    setRenameTarget(menuOpenId);
    setMenuOpenId(null);
  };

  const handleRenameSave = async () => {
    if (renameTarget == null) return;
    const id = renameTarget;
    const name = renameValue.trim();
    if (!name) return;

    const previous = alerts;
    setAlerts((prev) =>
      prev.map((a) => (a._id === id ? { ...a, alertName: name } : a))
    );
    setRenameTarget(null);
    setRenameValue("");

    try {
      const resp = await updateSearchAlert(id, { alertName: name });
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string" ? resp.message : "Rename failed"
        );
      }
      if (resp?.data) {
        setAlerts((prev) =>
          prev.map((a) =>
            a._id === id ? { ...a, alertName: resp.data!.alertName ?? name } : a
          )
        );
      }
      showToast(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "Alert renamed",
        "success"
      );
    } catch (err) {
      setAlerts(previous);
      showToast(err instanceof Error ? err.message : "Could not rename alert", "error");
    }
  };

  const handleRenameCancel = () => {
    setRenameTarget(null);
    setRenameValue("");
  };

  const handleCreateAlert = async (payload: {
    alertName: string;
    frequency: string;
  }) => {
    if (!defaultListingTypeId) {
      showToast("Listing types are not available. Try again later.", "error");
      throw new Error("No listing type");
    }
    const resp = await createSearchAlert({
      alertType: defaultListingTypeId,
      searchCriteria: {},
      alertName: payload.alertName.trim() || undefined,
      frequency: payload.frequency,
    });
    if (resp?.status === false) {
      const msg =
        typeof resp.message === "string" ? resp.message : "Could not create alert";
      showToast(msg, "error");
      throw new Error(msg);
    }
    showToast(
      typeof resp?.message === "string" && resp.message.trim()
        ? resp.message
        : "Alert created",
      "success"
    );
    await loadAlerts();
  };

  const handleDeleteAll = async () => {
    try {
      const resp = await deleteAllSearchAlerts();
      if (resp?.status === false) {
        throw new Error(
          typeof resp.message === "string" ? resp.message : "Delete failed"
        );
      }
      setAlerts([]);
      setIsDeleteAllOpen(false);
      showToast(
        typeof resp?.message === "string" && resp.message.trim()
          ? resp.message
          : "All alerts deleted",
        "success"
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete alerts", "error");
    }
  };

  const frequencyDropdownOptions = useMemo(() => {
    return frequencyOptions.filter(
      (o) => String(o?.name ?? "").trim() && String(o?.value ?? "").trim()
    );
  }, [frequencyOptions]);

  return (
    <div className="pf-account__page pf-saved-alerts">
      <Box className="pf-saved-alerts__header">
        <Typography variant="h2" className="pf-saved-alerts__title">
          Saved alerts
        </Typography>

        <Box className="pf-saved-alerts__header-actions">
          <Button
            variant="outlined"
            className="pf-saved-alerts__delete-btn"
            disabled={!hasAlerts || listLoading}
            onClick={() => setIsDeleteAllOpen(true)}
          >
            Delete all alerts
          </Button>
        </Box>
      </Box>

      {listLoading ? (
        <Box className="pf-saved-alerts__list">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Box key={`saved-alert-skel-${idx}`} className="pf-saved-alerts__item">
              <Skeleton variant="text" width="45%" />
              <Box className="pf-saved-alerts__item-center">
                <Box className="pf-saved-alerts__frequency">
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="rounded" width={220} height={36} />
                </Box>
              </Box>
              <Box className="pf-saved-alerts__item-actions">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
            </Box>
          ))}
        </Box>
      ) : listError ? (
        <Box className="pf-saved-alerts__empty" py={4}>
          <Typography variant="body1" color="error" gutterBottom>
            {listError}
          </Typography>
          <Button variant="contained" onClick={() => void loadAlerts()}>
            Try again
          </Button>
        </Box>
      ) : hasAlerts ? (
        <Box className="pf-saved-alerts__list">
          {sortedAlerts.map((alert) => (
            <Box key={alert._id} className="pf-saved-alerts__item">
              {renameTarget === alert._id ? (
                <Box className="pf-saved-alerts__rename-row">
                  <TextField
                    fullWidth
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="pf-saved-alerts__rename-input"
                    placeholder="Rename alert"
                    variant="outlined"
                  />
                  <Box className="pf-saved-alerts__rename-actions">
                    <Button
                      variant="contained"
                      className="pf-saved-alerts__rename-save"
                      onClick={() => void handleRenameSave()}
                      disabled={!renameValue.trim()}
                    >
                      Save
                    </Button>
                    <IconButton
                      aria-label="Cancel rename"
                      onClick={handleRenameCancel}
                      className="pf-saved-alerts__rename-cancel"
                    >
                      <ModalCloseIcon width={14} height={14} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography className="pf-saved-alerts__item-title">
                    {alert.alertName?.trim() || "Untitled alert"}
                  </Typography>

                  <Box className="pf-saved-alerts__item-center">
                    <Box className="pf-saved-alerts__frequency">
                      <Typography variant="body2" className="pf-saved-alerts__labels">
                        Receive updates
                      </Typography>

                      <Box
                        className="pf-saved-alerts__custom-select"
                        style={{ position: "relative" }}
                      >
                        <Box
                          className="pf-saved-alerts__select-btn"
                          onClick={() => handleToggle(alert._id)}
                        >
                          <Typography variant="body2" className="pf-saved-alert__name">
                            {frequencyLabelFor(alert.frequency, frequencyOptions)}
                          </Typography>
                          <DownArrowIconBlack width={14} height={14} />
                        </Box>

                        {openId === alert._id && (
                          <Box className="pf-saved-alerts__dropdown">
                            {frequencyDropdownOptions.map((opt) => {
                              const value = String(opt.value).trim();
                              const isSelected =
                                String(alert.frequency).trim().toLowerCase() ===
                                value.toLowerCase();
                              return (
                                <Box
                                  key={value}
                                  className={`pf-saved-alerts__dropdown-item ${isSelected ? "active" : ""}`}
                                  onClick={() => void handleFrequencySelect(alert._id, value)}
                                >
                                  {String(opt.name).trim()}
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box className="pf-saved-alerts__item-right">
                    <Typography className="pf-saved-alerts__created">
                      Created {daysSince(alert.createdAt)} days ago
                    </Typography>

                    <Box
                      className="pf-saved-alerts__custom-select__menu"
                      style={{ position: "relative" }}
                    >
                      <Box
                        className="pf-saved-alerts__select-menu-btn"
                        onClick={() => toggleMenu(alert._id)}
                      >
                        {menuOpenId === alert._id ? (
                          <ModalCloseIcon width={14} height={14} />
                        ) : (
                          <ThreeDotIcon width={16} height={16} />
                        )}
                      </Box>

                      {menuOpenId === alert._id && (
                        <Box className="pf-saved-alerts__menu-dropdown">
                          <Box
                            className="pf-saved-alerts__menu-dropdown-item"
                            onClick={handleRenameStart}
                          >
                            <RenamePencilIcon width={15} height={15} />
                            Rename
                          </Box>

                          <Box
                            className="pf-saved-alerts__menu-dropdown-item"
                            onClick={() => void handleDeleteAlert()}
                          >
                            <TrashBinIcon width={15} height={15} />
                            Delete
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Box className="pf-saved-alerts__empty">
          <Typography variant="h6">You don’t have any alerts</Typography>

          <Button
            variant="contained"
            className="pf-saved-alerts__create-btn pf-saved-alerts__create-btn--empty"
            onClick={() => setIsCreateAlertOpen(true)}
          >
            Create an alert
          </Button>
        </Box>
      )}

      <CommonModal
        open={isDeleteAllOpen}
        handleClose={() => setIsDeleteAllOpen(false)}
        className="pf-modal common_modal pf-saved-alerts__delete-modal"
      >
        <Box className="pf-modal__content pf-saved-alerts__delete-modal-content">
          <Typography component="h2" className="pf-modal__title">
            Delete all search alerts
          </Typography>
          <Typography className="pf-modal__subtitle">
            Are you sure want to delete all search alerts
          </Typography>
          <Box className="pf-saved-alerts__delete-actions">
            <Button
              variant="outlined"
              className="pf-saved-alerts__delete-cancel"
              onClick={() => setIsDeleteAllOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              className="pf-saved-alerts__delete-confirm"
              onClick={() => void handleDeleteAll()}
            >
              Delete all
            </Button>
          </Box>
        </Box>
      </CommonModal>

      <CreateAlertModal
        open={isCreateAlertOpen}
        onClose={() => setIsCreateAlertOpen(false)}
        frequencyOptions={frequencyDropdownOptions}
        onCreate={handleCreateAlert}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default SavedAlerts;
