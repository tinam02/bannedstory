import Image from './atoms/Image';

const Item = ({ d }:any) => {
   return (
    <div>
      <Image
        src={`data:image/png;base64,${d.metaInfo?.iconRaw}`}
        alt={d.description?.name}
      />
    </div>
  );
};

export default Item;
