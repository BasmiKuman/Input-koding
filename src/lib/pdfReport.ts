import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Distribution, InventorySummary, InventoryBatch } from '@/types/database';
import { format } from 'date-fns';

interface ReportData {
  date: string;
  batches: InventoryBatch[];
  distributions: Distribution[];
  summary: InventorySummary[];
}

export function generateDailyReport(data: ReportData) {
  const doc = new jsPDF();
  const reportDate = format(new Date(data.date), 'dd/MM/yyyy');
  
  let yPos = 0;

  const addPageHeader = () => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(42, 157, 143);
    doc.text('LAPORAN HARIAN INVENTORI', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Tanggal: ' + reportDate, 105, 22, { align: 'center' });
    
    doc.setDrawColor(42, 157, 143);
    doc.setLineWidth(0.5);
    doc.line(14, 25, 196, 25);
    
    yPos = 32;
  };

  const checkAndAddPage = (space: number) => {
    if (yPos + space > 270) {
      doc.addPage();
      yPos = 20;
      addPageHeader();
    }
  };

  addPageHeader();

  // Summary Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(42, 157, 143);
  doc.text('RINGKASAN STOK PRODUK', 14, yPos);
  yPos += 6;

  let totalCups = 0;
  let totalAddons = 0;
  let totalSold = 0;
  let totalReturned = 0;
  let totalRejected = 0;
  
  const summaryData = data.summary.map(item => {
    const inRider = item.total_distributed - item.total_sold - item.total_returned - item.total_rejected;
    const total = item.total_in_inventory + inRider;
    
    if (item.category === 'product') {
      totalCups += total;
    } else {
      totalAddons += total;
    }
    
    totalSold += item.total_sold;
    totalReturned += item.total_returned;
    totalRejected += item.total_rejected;
    
    return [
      item.product_name,
      item.category === 'product' ? 'Produk' : 'Add-on',
      item.total_in_inventory.toString(),
      inRider.toString(),
      (item.total_sold || 0).toString(),
      total.toString(),
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Produk', 'Tipe', 'Gudang', 'Rider', 'Terjual', 'Total']],
    body: summaryData,
    theme: 'grid',
    headStyles: { 
      fillColor: [42, 157, 143],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [50, 50, 50],
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [240, 248, 248],
    },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { halign: 'left' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Metrics
  checkAndAddPage(30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(42, 157, 143);
  doc.text('METRIK UTAMA', 14, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text('Total Cup: ' + totalCups + ' unit', 14, yPos);
  yPos += 5;
  doc.text('Total Add-on: ' + totalAddons + ' unit', 14, yPos);
  yPos += 5;
  doc.text('Total Terjual: ' + totalSold + ' unit', 14, yPos);
  yPos += 5;
  doc.text('Total Dikembalikan: ' + totalReturned + ' unit', 14, yPos);
  yPos += 5;
  doc.text('Total Ditolak/Rusak: ' + totalRejected + ' unit', 14, yPos);
  yPos += 10;

  // Rider Sales Summary - untuk perhitungan fee (DETAILED PER PRODUCT)
  checkAndAddPage(80);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(42, 157, 143);
  doc.text('REKAPITULASI PENJUALAN PER RIDER (untuk perhitungan fee)', 14, yPos);
  yPos += 6;

  // Group distributions by rider and build detailed table
  const riderDistributions = new Map<string, (typeof data.distributions)>();
  data.distributions.forEach(dist => {
    const riderId = dist.rider_id;
    if (!riderDistributions.has(riderId)) {
      riderDistributions.set(riderId, []);
    }
    riderDistributions.get(riderId)!.push(dist);
  });

  if (riderDistributions.size > 0) {
    // Build table data with detailed rows per product per rider
    const detailedData: any[] = [];
    let totalCupsSold = 0;
    let totalNominalRevenue = 0;

    // Sort riders by total nominal (highest first)
    const sortedRiderEntries = Array.from(riderDistributions.entries())
      .sort((a, b) => {
        const nominalA = a[1].reduce((sum, d) => sum + ((d.sold_quantity || 0) * (d.batch?.product?.price || 0)), 0);
        const nominalB = b[1].reduce((sum, d) => sum + ((d.sold_quantity || 0) * (d.batch?.product?.price || 0)), 0);
        return nominalB - nominalA;
      });

    for (const [riderId, distributions] of sortedRiderEntries) {
      const rider = distributions[0]?.rider;
      let riderCupsSold = 0;
      let riderNominal = 0;

      // Add detail rows for each product
      for (const dist of distributions) {
        const productName = dist.batch?.product?.name || '-';
        const isProduct = dist.batch?.product?.category === 'product';
        const soldQty = dist.sold_quantity || 0;
        const returnedQty = dist.returned_quantity || 0;
        const rejectedQty = dist.rejected_quantity || 0;
        const price = dist.batch?.product?.price || 0;
        const nominal = soldQty * price;

        // Track only products (not add-ons) for cup count
        if (isProduct && soldQty > 0) {
          riderCupsSold += soldQty;
          totalCupsSold += soldQty;
        }

        riderNominal += nominal;
        totalNominalRevenue += nominal;

        // Format nominal with proper currency formatting
        const nominalFormatted = nominal > 0 ? `Rp. ${nominal.toLocaleString('id-ID')}` : '-';

        detailedData.push([
          rider?.name || '-',
          productName,
          soldQty.toString(),
          returnedQty.toString(),
          rejectedQty.toString(),
          nominalFormatted,
          isProduct ? (soldQty > 0 ? soldQty.toString() : '0') : '(addon)',
        ]);
      }

      // Add rider summary row (bolder/different styling)
      if (distributions.length > 1 || distributions.some(d => d.quantity > 0)) {
        const nominalFormatted = riderNominal > 0 ? `Rp. ${riderNominal.toLocaleString('id-ID')}` : '-';
        detailedData.push([
          `SUBTOTAL: ${rider?.name}`,
          '',
          '',
          '',
          '',
          nominalFormatted,
          riderCupsSold.toString(),
        ]);
      }
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Rider', 'Produk', 'Terjual', 'Kembali', 'Reject', 'Nominal', 'Cup Terjual']],
      body: detailedData,
      theme: 'grid',
      headStyles: { 
        fillColor: [42, 157, 143],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [240, 248, 248],
      },
      didParseCell: (data) => {
        // Make subtotal rows bold
        if (data.cell.text?.[0]?.includes('SUBTOTAL')) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 240, 240];
        }
      },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 30 },
        1: { halign: 'left', cellWidth: 35 },
        2: { halign: 'center', textColor: [34, 139, 34] }, // green for sold
        3: { halign: 'center', textColor: [184, 134, 11] }, // orange for returned
        4: { halign: 'center', textColor: [178, 34, 34] }, // red for rejected
        5: { halign: 'right', textColor: [0, 102, 204] }, // blue for nominal
        6: { halign: 'center' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Add totals summary at bottom
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(42, 157, 143);
    
    const totalNominalFormatted = `Rp. ${totalNominalRevenue.toLocaleString('id-ID')}`;
    doc.text(`TOTAL CUP TERJUAL: ${totalCupsSold} unit`, 14, yPos);
    yPos += 4;
    doc.text(`TOTAL NOMINAL: ${totalNominalFormatted}`, 14, yPos);
    yPos += 6;

    // Add fee calculation note
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Catatan: Kolom "Cup Terjual" hanya menghitung produk utama, bukan add-on', 14, yPos);
    yPos += 3;
    doc.text('Gunakan "Total Nominal" untuk menghitung komisi: Total Nominal × fee%', 14, yPos);
  }

  // PAGE 2: Production & Distribution
  doc.addPage();
  yPos = 20;
  addPageHeader();

  const todayBatches = data.batches.filter(b => b.production_date === data.date);
  if (todayBatches.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(42, 157, 143);
    doc.text('PRODUKSI HARI INI', 14, yPos);
    yPos += 6;

    const prodData = todayBatches.map(b => [
      b.product?.name || '-',
      b.initial_quantity.toString(),
      format(new Date(b.production_date), 'dd/MM/yyyy'),
      format(new Date(b.expiry_date), 'dd/MM/yyyy'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Produk', 'Qty', 'Produksi', 'Kadaluarsa']],
      body: prodData,
      theme: 'grid',
      headStyles: { 
        fillColor: [42, 157, 143],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [240, 248, 248],
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Distribution
  if (data.distributions.length > 0) {
    checkAndAddPage(60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(42, 157, 143);
    doc.text('DISTRIBUSI', 14, yPos);
    yPos += 6;

    const distData = data.distributions.map(d => [
      d.rider?.name || '-',
      d.batch?.product?.name || '-',
      d.quantity.toString(),
      (d.sold_quantity || 0).toString(),
      (d.returned_quantity || 0).toString(),
      (d.rejected_quantity || 0).toString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Rider', 'Produk', 'Qty', 'Terjual', 'Retur', 'Tolak']],
      body: distData,
      theme: 'grid',
      headStyles: { 
        fillColor: [42, 157, 143],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [240, 248, 248],
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Reject Summary Section
  const riderRejected = data.distributions.reduce((acc, d) => acc + (d.rejected_quantity || 0), 0);
  if (riderRejected > 0) {
    checkAndAddPage(40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 60, 60); // Red color for reject
    doc.text('❌ PRODUK DITOLAK/RUSAK (RIDER)', 14, yPos);
    yPos += 6;

    // Reject by product
    const rejectByProduct = new Map<string, number>();
    data.distributions.forEach(d => {
      if (d.rejected_quantity > 0) {
        const name = d.batch?.product?.name || 'Unknown';
        rejectByProduct.set(name, (rejectByProduct.get(name) || 0) + d.rejected_quantity);
      }
    });

    const rejectProdData = Array.from(rejectByProduct.entries()).map(([name, qty]) => [
      name,
      qty.toString(),
    ]);

    if (rejectProdData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Produk', 'Qty Ditolak']],
        body: rejectProdData,
        theme: 'grid',
        headStyles: { 
          fillColor: [200, 60, 60],
          textColor: [255, 255, 255],
          fontSize: 9,
        },
        bodyStyles: {
          textColor: [50, 50, 50],
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [255, 240, 240],
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Reject by rider
    checkAndAddPage(30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 60, 60);
    doc.text('Penolakan Per Rider:', 14, yPos);
    yPos += 5;

    const rejectByRider = new Map<string, number>();
    data.distributions.forEach(d => {
      if (d.rejected_quantity > 0) {
        const name = d.rider?.name || 'Unknown';
        rejectByRider.set(name, (rejectByRider.get(name) || 0) + d.rejected_quantity);
      }
    });

    const rejectRiderData = Array.from(rejectByRider.entries()).map(([name, qty]) => [
      name,
      qty.toString(),
    ]);

    if (rejectRiderData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Rider', 'Qty Ditolak']],
        body: rejectRiderData,
        theme: 'grid',
        headStyles: { 
          fillColor: [200, 60, 60],
          textColor: [255, 255, 255],
          fontSize: 9,
        },
        bodyStyles: {
          textColor: [50, 50, 50],
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [255, 240, 240],
        },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // PAGE 3: Inventory Details
  doc.addPage();
  yPos = 20;
  addPageHeader();

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(42, 157, 143);
  doc.text('DETAIL BATCH INVENTORI', 14, yPos);
  yPos += 6;

  const batchData = data.batches
    .filter(b => b.current_quantity > 0)
    .map(b => [
      b.product?.name || '-',
      b.current_quantity.toString(),
      format(new Date(b.production_date), 'dd/MM/yyyy'),
      format(new Date(b.expiry_date), 'dd/MM/yyyy'),
      getDaysUntilExpiry(b.expiry_date),
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Produk', 'Stok', 'Produksi', 'Kadaluarsa', 'Sisa Hari']],
    body: batchData,
    theme: 'grid',
    headStyles: { 
      fillColor: [42, 157, 143],
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [50, 50, 50],
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [240, 248, 248],
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Expiry Warnings
  const allBatches = data.batches;
  const almostExpired = allBatches.filter(b => {
    const daysUntil = Math.ceil(
      (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil >= 0 && daysUntil <= 3 && b.current_quantity > 0;
  });

  const alreadyExpired = allBatches.filter(b => {
    const daysUntil = Math.ceil(
      (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil < 0 && b.current_quantity > 0 && (!b.notes || !b.notes.includes('REJECTED'));
  });

  // Section: Almost Expired (≤3 hari)
  if (almostExpired.length > 0) {
    checkAndAddPage(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text('PRODUK AKAN EXPIRED (≤3 HARI)', 14, yPos);
    yPos += 6;

    const almostExpiredData = almostExpired.map(b => {
      const daysUntil = Math.ceil(
        (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return [
        b.product?.name || '-',
        b.current_quantity.toString(),
        format(new Date(b.production_date), 'dd/MM/yyyy'),
        format(new Date(b.expiry_date), 'dd/MM/yyyy'),
        daysUntil === 0 ? 'Hari ini!' : daysUntil + ' hari',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Produk', 'Stok', 'Produksi', 'Kadaluarsa', 'Sisa Hari']],
      body: almostExpiredData,
      theme: 'grid',
      headStyles: { 
        fillColor: [245, 158, 11],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [255, 243, 224],
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Section: Already Expired
  if (alreadyExpired.length > 0) {
    checkAndAddPage(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('PRODUK SUDAH EXPIRED', 14, yPos);
    yPos += 6;

    const expiredData = alreadyExpired.map(b => {
      const daysUntil = Math.ceil(
        (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return [
        b.product?.name || '-',
        b.current_quantity.toString(),
        format(new Date(b.production_date), 'dd/MM/yyyy'),
        format(new Date(b.expiry_date), 'dd/MM/yyyy'),
        Math.abs(daysUntil) + ' hari lalu',
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Produk', 'Stok', 'Produksi', 'Kadaluarsa', 'Sudah Expired']],
      body: expiredData,
      theme: 'grid',
      headStyles: { 
        fillColor: [239, 68, 68],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [254, 226, 226],
      },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Rejection Data
  const rejectedBatches = data.batches.filter(b => b.notes && b.notes.includes('REJECTED'));
  
  if (rejectedBatches.length > 0) {
    checkAndAddPage(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('PRODUK DIMUSNAHKAN', 14, yPos);
    yPos += 6;

    const rejectionData = rejectedBatches.map(b => {
      const notesMatch = b.notes?.match(/REJECTED: (.+?) at/);
      const reason = notesMatch ? notesMatch[1] : 'Expired';
      return [
        b.product?.name || '-',
        b.initial_quantity?.toString() || '0',
        format(new Date(b.production_date), 'dd/MM/yyyy'),
        format(new Date(b.expiry_date), 'dd/MM/yyyy'),
        reason,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Produk', 'Jumlah', 'Produksi', 'Kadaluarsa', 'Alasan']],
      body: rejectionData,
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [255, 240, 240],
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.line(14, 285, 196, 285);
    doc.text('Halaman ' + i + ' dari ' + pageCount, 105, 290, { align: 'center' });
    doc.text('Dibuat: ' + format(new Date(), 'dd/MM/yyyy HH:mm'), 105, 296, { align: 'center' });
  }

  const filename = 'Laporan_Inventori_' + format(new Date(data.date), 'yyyy-MM-dd') + '.pdf';
  doc.save(filename);
}

function getDaysUntilExpiry(expiryDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diff < 0) return 'EXPIRED';
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return '1 hari';
  return diff + ' hari';
}
