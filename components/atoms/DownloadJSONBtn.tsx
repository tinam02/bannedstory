import { IChar } from '@/types';

const DownloadJSONBtn = ({ json }: { json: IChar }) => {
  return (
    <>
      <a
        href={`data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify({
            item: 'dfsfd',
          })
        )}`}
        download='filename.json'
      >
        {`Download Json`}
      </a>
    </>
  );
};

export default DownloadJSONBtn;
