import { AlignmentType, Footer, PageNumber, Paragraph, TextRun } from 'docx';

export function createPageFooter(position) {
  const alignment = position === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER;
  return new Footer({
    children: [new Paragraph({
      alignment,
      children: [new TextRun({ children: [PageNumber.CURRENT], color: '000000' })]
    })]
  });
}

export function createPageSettings(settings, formatType, start) {
  const paperMap = { A4: [11906, 16838], A5: [8391, 11906], Letter: [12240, 15840], Legal: [12240, 20160], F4: [11906, 18720] };
  let [width, height] = paperMap[settings.paper.size] || paperMap.A4;
  if (settings.paper.orientation === 'landscape') [width, height] = [height, width];
  const cm = (value) => Math.round(Number(value || 0) * 567);
  const page = { size: { width, height } };
  if (settings.rules.margins) page.margin = {
    top: cm(settings.paper.top), bottom: cm(settings.paper.bottom),
    left: cm(settings.paper.left), right: cm(settings.paper.right)
  };
  if (formatType) page.pageNumbers = { formatType, start: start || 1 };
  return page;
}
