'use client';

import { useEffect } from 'react';
import { moduleConfig } from '@/lib/modules';
import { swapPaciente } from '@/lib/terms';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

function fixText(node: Text) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.isContentEditable) return;
  const next = swapPaciente(node.data);
  if (next !== node.data) node.data = next;
}

function fixAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const next = swapPaciente(v);
      if (next !== v) el.setAttribute(a, next);
    }
  }
}

function fixTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    fixText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (SKIP_TAGS.has((root as Element).tagName)) return;
  fixAttrs(root as Element);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) fixText(n as Text);
    else fixAttrs(n as Element);
    n = walker.nextNode();
  }
}

// Solo en instalaciones donde se usa "cliente": cambia la palabra "paciente" en todo lo que se ve en pantalla.
export default function TermsReplacer() {
  useEffect(() => {
    if (!moduleConfig.clientes) return;
    fixTree(document.body);
    document.title = swapPaciente(document.title);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') fixTree(m.target);
        else if (m.type === 'attributes') fixAttrs(m.target as Element);
        else m.addedNodes.forEach((node) => fixTree(node));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => observer.disconnect();
  }, []);

  return null;
}
