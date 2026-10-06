/**
 * One checklist item. `name` matches its column in the submissions table.
 * @typedef {object} ChecklistItem
 * @property {string} name
 * @property {string} label
 */
 
/**
 * A titled group of checklist items.
 * @typedef {object} ChecklistGroup
 * @property {string} title
 * @property {ChecklistItem[]} items
 */
 
/**
 * The safety checklist, shared by the form (to draw the checkboxes) and the
 * detail page (to show the answers).
 * @type {ChecklistGroup[]}
 */

export const CHECKLIST = [
  {
    title: 'Protective equipment',
    items: [
      { name: 'hard_hat', label: 'Hard hat' },
      { name: 'hi_vis_vest', label: 'High-visibility vest' },
      { name: 'safety_boots', label: 'Safety boots' },
      { name: 'eye_protection', label: 'Eye protection' },
    ],
  },
  {
    title: 'Site and equipment',
    items: [
      { name: 'fall_protection', label: 'Fall protection in place' },
      { name: 'ladders_scaffolding_inspected', label: 'Ladders and scaffolding inspected' },
      { name: 'tools_cords_ok', label: 'Tools and cords in good condition' },
      { name: 'hazards_identified', label: 'Hazards identified' },
    ],
  },
];

export const CHECKLIST_NAMES = CHECKLIST.flatMap((group) => group.items.map((item) => item.name));