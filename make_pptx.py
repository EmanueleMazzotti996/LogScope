import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN

def create_executive_presentation():
    template_path = r'c:\Users\emanu\Desktop\Parvis\GODLOG\TEMPLATEprvs.pptx'
    output_filename = 'Parvis_Loggy-Eye_Executive_Presentation_IT.pptx'
    screenshots_dir = r'c:\Users\emanu\Desktop\Parvis\GODLOG\screenshots presentazione'
    
    if not os.path.exists(template_path):
        print(f"Template not found at {template_path}")
        return

    # Load presentation
    prs = Presentation(template_path)
    
    # CLEAR ALL EXISTING SLIDES in the template to avoid confusion
    # We iterate over the slide ID list and remove each element
    for sld in list(prs.slides._sldIdLst):
        prs.slides._sldIdLst.remove(sld)
    
    # Slides content
    slides_data = [
        {
            'title': 'Parvis Loggy Eye',
            'subtitle': 'Diagnostic Intelligence per l\'Ecosistema Abaco Server',
            'layout_idx': 5, # 1_Titolo (has placeholders)
            'type': 'title'
        },
        {
            'title': 'Il Gap Operativo: Complessità e Volumi',
            'points': [
                'Log frammentati tra ICS e Server Library.',
                'File >100MB: navigazione lenta e dispendiosa.',
                'MTTR elevato per identificazione "root cause".'
            ],
            'image': 'logsyntesis.png',
            'layout_idx': 1
        },
        {
            'title': 'La Visione: Intelligence a Portata di Mano',
            'points': [
                'Dashboard unificata per analisi forense immediata.',
                'Interfaccia Premium: navigazione fluida e virtualizzata.',
                'Supporto Multi-lingua e Guida Integrata.'
            ],
            'image': 'guide.png',
            'layout_idx': 1
        },
        {
            'title': 'Motore di Analisi ad Alte Prestazioni',
            'points': [
                'Tracking automatico dei Boot e anomalie di sistema.',
                'Deduplicazione intelligente dei thread.',
                'Jump istantaneo dal report all\'evento nel log.'
            ],
            'image': 'riassunto eventi server.png',
            'layout_idx': 1
        },
        {
            'title': 'Impatto Customer Service e Monitoring',
            'points': [
                'Rilevamento automatico di blackout e switch offline.',
                'Identificazione rapida di lotti di produzione critici.',
                'Analisi delle performance (Operations >60s).'
            ],
            'image': 'offlinedetection.png',
            'layout_idx': 1
        },
        {
            'title': 'Valore Strategico: Efficienza e Brand',
            'points': [
                'Riduzione dipendenza da R&D per analisi di campo.',
                'Percezione tecnologica elevata verso il cliente.',
                'Soluzione Standalone (Portable EXE) pronta all\'uso.'
            ],
            'image': 'funzione findall.png',
            'layout_idx': 1
        },
        {
            'title': 'Conclusioni e Roadmap',
            'points': [
                'Standardizzazione della diagnostica Parvis.',
                'Scalabile per futuri moduli di analisi.',
                'Pronta per il deployment su scala globale.'
            ],
            'image': 'querylogscustomerserver.png',
            'layout_idx': 1
        }
    ]

    for data in slides_data:
        layout = prs.slide_layouts[data['layout_idx']]
        slide = prs.slides.add_slide(layout)
        
        # Handle Title (usually placeholder 0)
        try:
            title_shape = None
            if slide.shapes.title:
                title_shape = slide.shapes.title
            else:
                # Fallback: look for placeholder 0
                for shape in slide.placeholders:
                    if shape.placeholder_format.idx == 0:
                        title_shape = shape
                        break
            
            if title_shape:
                title_shape.text = data['title']
        except Exception as e:
            print(f"Could not set title for '{data['title']}': {e}")

        if data.get('type') == 'title':
            # Handle Copertina (Layout 0)
            try:
                # Subtitle is usually at idx 1
                subtitle_shape = None
                for shape in slide.placeholders:
                    if shape.placeholder_format.idx == 1:
                        subtitle_shape = shape
                        break
                
                if subtitle_shape:
                    subtitle_shape.text = data.get('subtitle', '')
            except Exception as e:
                print(f"Could not set subtitle: {e}")
        else:
            # Handle Content Slide (Layout 1)
            try:
                # Find body placeholder (idx 10 based on inspection)
                body_shape = None
                for shape in slide.placeholders:
                    if shape.placeholder_format.idx == 10:
                        body_shape = shape
                        break
                
                if body_shape:
                    tf = body_shape.text_frame
                    tf.text = data['points'][0]
                    for point in data['points'][1:]:
                        p = tf.add_paragraph()
                        p.text = point
                        p.level = 0
                
                # Add Image if present
                if 'image' in data:
                    img_path = os.path.join(screenshots_dir, data['image'])
                    if os.path.exists(img_path):
                        # Postion image: middle-right
                        # Slide is approx 10 inches wide
                        left = Inches(5.0)
                        top = Inches(1.5)
                        width = Inches(4.5)
                        slide.shapes.add_picture(img_path, left, top, width=width)
            except Exception as e:
                print(f"Error on slide content '{data['title']}': {e}")

    prs.save(output_filename)
    print(f"Generata presentazione PULITA: {output_filename}")

if __name__ == "__main__":
    create_executive_presentation()
