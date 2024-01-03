import { IChar } from '@/types';

const DownloadJSONBtn = ({ json, text }: { json: IChar; text?: string }) => {
  //gets char from local storage and downloads it as a json file
  const lsJson = localStorage.getItem('char') || '';

  return (
    <>
      <a
        href={`data:text/json;charset=utf-8,${encodeURIComponent(lsJson)}`}
        download='char.json'
      >
        {text || `Download Json`}
      </a>
    </>
  );
};

export default DownloadJSONBtn;
