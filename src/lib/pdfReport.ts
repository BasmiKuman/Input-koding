import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Distribution, InventorySummary, InventoryBatch } from '@/types/database';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface ReportData {
  date: string;
  batches: InventoryBatch[];
  distributions: Distribution[];
  summary: InventorySummary[];
}

export function generateDailyReport(data: ReportData) {
  const doc = new jsPDF();
  const reportDate = format(new Date(data.date), 'dd MMMM yyyy', { locale: localeId });
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Harian Inventori', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal: ${reportDate}`, 105, 30, { align: 'center' });
  
  let yPos = 45;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Stok', 14, yPos);
  yPos += 5;

  // Calculate totals
  let totalCups = 0;
  let totalAddons = 0;
  
  const summaryData = data.summary.map(item => {
    const inRider = item.total_distributed - item.total_sold - item.total_returned;
    const total = item.total_in_inventory + inRider;
    
    if (item.category === 'product') {
      totalCups += total;
    } else {
      totalAddons += total;
    }
    
    return [
      item.product_name,
      item.category === 'product' ? 'Produk' : 'Add-on',
      item.total_in_inventory.toString(),
      inRider.toString(),
      total.toString(),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Produk', 'Kategori', 'Di Gudang', 'Di Rider', 'Total']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [42, 157, 143] },
    styles: { fontSize: 10 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Cup calculation
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Cup (Produk): ${totalCups}`, 14, yPos);
  yPos += 7;
  doc.text(`Total Add-on: ${totalAddons}`, 14, yPos);
  yPos += 15;

  // Production batches today
  const todayBatches = data.batches.filter(b => 
    b.production_date === data.date
  );

  if (todayBatches.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Produksi Hari Ini', 14, yPos);
    yPos += 5;

    const productionData = todayBatches.map(batch => [
      batch.product?.name || '-',
      batch.initial_quantity.toString(),
      format(new Date(batch.production_date), 'dd/MM/yyyy'),
      format(new Date(batch.expiry_date), 'dd/MM/yyyy'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Produk', 'Jumlah', 'Tgl Produksi', 'Expired']],
      body: productionData,
      theme: 'striped',
      headStyles: { fillColor: [42, 157, 143] },
      styles: { fontSize: 10 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Distributions today
  if (data.distributions.length > 0) {
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribusi Hari Ini', 14, yPos);
    yPos += 5;

    const distData = data.distributions.map(dist => {
      const batchInfo = dist.batch 
        ? `${format(new Date(dist.batch.production_date), 'dd/MM')} - ${format(new Date(dist.batch.expiry_date), 'dd/MM')}`
        : '-';
      
      return [
        dist.rider?.name || '-',
        dist.batch?.product?.name || '-',
        dist.quantity.toString(),
        batchInfo,
        dist.sold_quantity?.toString() || '0',
        dist.returned_quantity?.toString() || '0',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Rider', 'Produk', 'Qty', 'Batch', 'Terjual', 'Retur']],
      body: distData,
      theme: 'striped',
      headStyles: { fillColor: [42, 157, 143] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Batch details
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detail Batch Inventori', 14, yPos);
  yPos += 5;

  const batchDetails = data.batches
    .filter(b => b.current_quantity > 0)
    .map(batch => [
      batch.product?.name || '-',
      batch.current_quantity.toString(),
      format(new Date(batch.production_date), 'dd/MM/yyyy'),
      format(new Date(batch.expiry_date), 'dd/MM/yyyy'),
      getDaysUntilExpiry(batch.expiry_date),
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Produk', 'Stok', 'Tgl Produksi', 'Expired', 'Sisa Hari']],
    body: batchDetails,
    theme: 'striped',
    headStyles: { fillColor: [42, 157, 143] },
    styles: { fontSize: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Halaman ${i} dari ${pageCount} | Dibuat: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save
  const filename = `Laporan_Inventori_${format(new Date(data.date), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

function getDaysUntilExpiry(expiryDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return '1 hari';
  return `${diffDays} hari`;
}
