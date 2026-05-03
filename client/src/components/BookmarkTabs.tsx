/**
 * BookmarkTabs
 * Red ribbon bookmarks on the right edge of the right page.
 */

export type BookmarkTab =
  | 'overview'
  | 'materials'
  | 'proscons'
  | 'stats'
  | 'tips';

const TABS: { id: BookmarkTab; icon: string; label: string }[] = [
  { id: 'overview',  icon: '📖', label: 'Overview'    },
  { id: 'materials', icon: '⚒',  label: 'Materials'   },
  { id: 'proscons',  icon: '⚖',  label: 'Pros & Cons' },
  { id: 'stats',     icon: '📊',  label: 'Stats'       },
  { id: 'tips',      icon: '🕯',  label: 'Notes'       },
];

interface BookmarkTabsProps {
  active: BookmarkTab;
  onChange: (tab: BookmarkTab) => void;
}

export default function BookmarkTabs({ active, onChange }: BookmarkTabsProps) {
  return (
    <div className="bookmark-rail">
      {TABS.map((tab) => (
        <div
          key={tab.id}
          className={`bookmark${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <div className="bookmark-ribbon">
            <span className="bookmark-icon">{tab.icon}</span>
          </div>
          <span className="bookmark-label">{tab.label}</span>
        </div>
      ))}
    </div>
  );
}
