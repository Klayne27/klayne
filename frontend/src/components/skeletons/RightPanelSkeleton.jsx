const RightPanelSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 my-2 w-full">
      <div className="flex gap-2 items-center">
        <div className="skeleton size-[34px] rounded-full shrink-0"></div>
        <div className="flex w-full justify-between">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-3 w-12 rounded-full"></div>
            <div className="skeleton h-2 w-16 rounded-full"></div>
          </div>
          <div className="skeleton h-7 w-[68px] md:w-[90px] rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
export default RightPanelSkeleton;
