"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Download, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as XLSX from "xlsx";

import { fmtFCFA } from "@/lib/parcelles";

interface EtatsClientProps {
  initialEncaissements: any[];
  defaultStartDate: string;
  defaultEndDate: string;
}

export function EtatsClient({
  initialEncaissements,
  defaultStartDate,
  defaultEndDate,
}: EtatsClientProps) {
  const router = useRouter();

  // Filter dates state
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Pagination and dropdowns state
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sync state if props change (e.g. from URL navigation)
  useEffect(() => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setPage(1);
  }, [defaultStartDate, defaultEndDate]);

  // Compute total amount of all filtered encaissements
  const totalAmount = useMemo(() => {
    return initialEncaissements.reduce((sum, item) => sum + item.amount, 0);
  }, [initialEncaissements]);

  // Format dates for display in PDF / Excel
  const startDateFormatted = useMemo(() => {
    if (!startDate) return "";
    return new Date(startDate).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [startDate]);

  const endDateFormatted = useMemo(() => {
    if (!endDate) return "";
    return new Date(endDate).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [endDate]);

  // Handle URL updates when clicking "Valider la période"
  const handleValidatePeriod = () => {
    router.push(`/dashboard/importations/etats?startDate=${startDate}&endDate=${endDate}`);
  };

  // Pagination calculation
  const totalPages = Math.ceil(initialEncaissements.length / pageSize) || 1;
  const pagedData = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return initialEncaissements.slice(startIdx, startIdx + pageSize);
  }, [initialEncaissements, page, pageSize]);

  // PDF Export trigger (primary themed direct PDF download)
  const handleDownloadPDF = () => {
    const runExport = () => {
      const element = document.getElementById("pdf-report-template");
      if (!element) return;

      const pdfFilename = startDate && endDate
        ? `Etat_des_encaissements_${startDate}_to_${endDate}.pdf`
        : "Etat_des_encaissements.pdf";

      const opt = {
        margin:       10,
        filename:     pdfFilename,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
      };

      (window as any).html2pdf().from(element).set(opt).save();
    };

    if (!(window as any).html2pdf) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = runExport;
      document.head.appendChild(script);
    } else {
      runExport();
    }
  };

  // Excel (.XLSX) Export trigger via 'xlsx' utility sheet builder
  const handleDownloadExcel = () => {
    const startText = new Date(startDate).toLocaleDateString("fr-FR");
    const endText = new Date(endDate).toLocaleDateString("fr-FR");

    const rows = [
      ["État des encaissements"],
      [`Période : ${startText} au ${endText}`],
      [],
      [
        "Date d'encaissement",
        "Montant encaissé",
        "Police contrat",
        "Date début contrat",
        "Date fin contrat",
        "Référence émission",
        "Montant émission",
        "Nom client",
      ],
    ];

    initialEncaissements.forEach((item) => {
      rows.push([
        item.paymentDateRaw,
        item.amount,
        item.contractRef,
        item.contractStart,
        item.contractEnd,
        item.emissionRef,
        item.emissionAmount,
        item.clientName,
      ]);
    });

    rows.push([]);
    rows.push(["", `Total : ${totalAmount} FCFA`, "", "", "", "", "", ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto-fit column widths
    const maxColWidths =
      rows[3]?.map((_, colIndex) => {
        return Math.max(...rows.map((row) => (row[colIndex] ? String(row[colIndex]).length : 0))) + 3;
      }) || [];
    ws["!cols"] = maxColWidths.map((w) => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Etats");
    XLSX.writeFile(wb, `Etat_des_encaissements_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      {/* Page Title & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text">
            États
          </h1>
          <p className="mt-1 font-sans text-sm text-text-2">
            Consultez et téléchargez les états par périodes
          </p>
        </div>
      </div>

      {/* Date filter card styled in Sand/Primary Theme */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <div className="flex items-center gap-2 text-primary font-semibold font-display text-base">
          <Calendar className="h-5 w-5" />
          <h2>Sélection de période</h2>
        </div>
        <p className="text-xs text-text-2 mt-1 mb-4 font-sans">
          Choisissez la période pour charger les états
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-2 font-sans">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface-2/40 px-4 font-sans text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-2 font-sans">Date de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface-2/40 px-4 font-sans text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleValidatePeriod}
            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-sans text-sm font-semibold transition-colors cursor-pointer self-end"
          >
            Valider la période
          </button>
        </div>
      </div>

      {/* Summary Banner with Left Primary Border */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 border-l-4 border-l-primary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="block text-xs font-semibold text-text-2 uppercase tracking-wider font-sans">Total</span>
          <span className="font-mono text-2xl font-bold text-primary">{fmtFCFA(totalAmount)} FCFA</span>
        </div>
        <div className="sm:text-right">
          <span className="block text-xs font-semibold text-text-2 uppercase tracking-wider font-sans">Sur un total de</span>
          <span className="font-mono text-xl font-bold text-text">{initialEncaissements.length} encaissement(s)</span>
        </div>
      </div>

      {/* Download Dropdown Selector */}
      {totalAmount > 0 && (
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setDownloadOpen(!downloadOpen)}
            className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white py-2.5 px-4 font-sans text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Télécharger
            <ChevronDown className="h-4 w-4" />
          </button>

          {downloadOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setDownloadOpen(false)} />
              <div className="absolute left-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg py-1.5 z-30 font-sans text-sm text-text animate-[fadeUp_.15s_ease_both]">
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadPDF();
                    setDownloadOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-surface-2 transition-colors cursor-pointer block"
                >
                  Télécharger au format PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadExcel();
                    setDownloadOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-surface-2 transition-colors cursor-pointer block"
                >
                  Télécharger au format Excel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left font-sans text-sm border-collapse">
          <thead className="bg-surface-2 text-text font-semibold border-b border-border">
            <tr>
              <th className="px-5 py-3.5">Date d'encaissement</th>
              <th className="px-5 py-3.5">Police contrat</th>
              <th className="px-5 py-3.5">Emission</th>
              <th className="px-5 py-3.5">Client</th>
              <th className="px-5 py-3.5">Montant encaissé</th>
              <th className="px-5 py-3.5">Dates du contrat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {pagedData.length > 0 ? (
              pagedData.map((e) => (
                <tr key={e.id} className="hover:bg-surface-2/60 transition-colors">
                  <td className="px-5 py-4 font-semibold text-text-2 whitespace-nowrap">
                    {e.paymentDateFormatted}
                  </td>
                  <td className="px-5 py-4 font-bold text-text truncate max-w-[150px]" title={e.contractRef}>
                    {e.contractRef}
                  </td>
                  <td className="px-5 py-4 font-semibold text-text-2 truncate max-w-[150px]" title={e.emissionRef}>
                    {e.emissionRef}
                  </td>
                  <td className="px-5 py-4 font-medium text-text truncate max-w-[180px]" title={e.clientName}>
                    {e.clientName}
                  </td>
                  <td className="px-5 py-4 font-bold text-primary whitespace-nowrap">
                    {fmtFCFA(e.amount)} FCFA
                  </td>
                  <td className="px-5 py-4 text-text-2 text-xs font-semibold whitespace-nowrap leading-relaxed">
                    <div><span className="text-text-2/60 font-normal">Début contrat :</span> {e.contractStartFormatted}</div>
                    <div className="mt-0.5"><span className="text-text-2/60 font-normal">Fin contrat :</span> {e.contractEndFormatted}</div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-2 font-medium">
                  Aucun encaissement trouvé sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 font-sans text-xs text-text-2">
          <span>Lignes par page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text outline-none"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
          </select>
        </div>

        <div className="font-sans text-xs text-text-2">
          {initialEncaissements.length} résultat(s) au total
        </div>

        <div className="flex items-center gap-3 font-sans text-xs font-medium text-text-2">
          <span>
            Page {page} sur {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Container for PDF Export */}
      <div
        id="pdf-report-template"
        className="absolute -left-[9999px] -top-[9999px] w-[794px] bg-[#fffdf9] p-10 text-[#22201d] font-sans"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="text-2xl font-bold text-primary font-serif">
            Votre Entreprise
          </div>
          <div className="text-right text-[11px] text-text-2 leading-relaxed">
            Adresse complète<br />
            Téléphone : 00 00 00 00<br />
            Email : contact@entreprise.com
          </div>
        </div>

        <div className="h-0.5 bg-primary w-full mb-6" />

        <h1 className="text-center text-xl font-bold uppercase tracking-wider mb-2">
          État des encaissements
        </h1>
        <p className="text-center text-xs text-text-2 mb-6">
          Période : {startDate ? `du ${startDateFormatted}` : ""} {endDate ? `au ${endDateFormatted}` : ""}
        </p>

        <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-r-lg mb-6">
          <div className="text-xs text-text-2">
            Nombre d'encaissements : <span className="font-bold text-primary">{initialEncaissements.length}</span>
          </div>
          <div className="text-xs text-text-2 mt-1">
            Total encaissé : <span className="font-bold text-primary">{fmtFCFA(totalAmount)} FCFA</span>
          </div>
        </div>

        <table className="w-full text-left text-[11px] border-collapse mb-8">
          <thead>
            <tr className="bg-primary text-white font-bold">
              <th className="p-3">Date d'encaissement</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Contrat</th>
              <th className="p-3">Effet contrat</th>
              <th className="p-3">Echéance contrat</th>
              <th className="p-3">Emission</th>
              <th className="p-3">Montant émission</th>
              <th className="p-3">Client</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {initialEncaissements.map((item) => (
              <tr key={item.id} className="border-b border-primary/5">
                <td className="p-3">{item.paymentDateFormatted}</td>
                <td className="p-3 font-bold text-primary">{fmtFCFA(item.amount)} FCFA</td>
                <td className="p-3 font-bold">{item.contractRef}</td>
                <td className="p-3 text-text-2">{item.contractStartFormatted}</td>
                <td className="p-3 text-text-2">{item.contractEndFormatted}</td>
                <td className="p-3">{item.emissionRef}</td>
                <td className="p-3 text-text-2">{fmtFCFA(item.emissionAmount)}</td>
                <td className="p-3">{item.clientName}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right text-base font-bold text-primary border-t-2 border-primary pt-3">
          Total encaissé : {fmtFCFA(totalAmount)} FCFA
        </div>
      </div>
    </div>
  );
}
