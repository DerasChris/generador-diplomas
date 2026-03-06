import axios from "axios";

export default function UploadCSV({ setNames }) {

 const upload = async (e) => {

   const file = e.target.files[0];

   const formData = new FormData();
   formData.append("file", file);

   const res = await axios.post(
     "http://localhost:5000/upload-csv",
     formData
   );

   setNames(res.data.data);
 };

 return (
   <div>
     <h2>Subir CSV</h2>
     <input type="file" onChange={upload}/>
   </div>
 );
}