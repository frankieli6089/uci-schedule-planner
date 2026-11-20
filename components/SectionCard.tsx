import type { WebsocSection } from "websoc-api";

type SectionCardProps = {
  section: WebsocSection;
  isSelected: boolean; 
  onSelect: () => void;
};

export default function SectionCard({ section, isSelected, onSelect, }: SectionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-2 ${ 
        isSelected 
        ? "border-black bg-gray-100" 
        : "border-gray-200 bg-white" }`}
    >
      <p className="font-semibold text-gray-900">
        {section.sectionType} {section.sectionNum}
      </p>

      <p className="mt-1 text-gray-600">
        {section.meetings[0].days}{" "}
        {section.meetings[0].time}{" "}
        · {section.meetings[0].bldg}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {section.instructors.join(", ")} · {section.status}
      </p>
    </div>
  );
}