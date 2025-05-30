import { getUrl, remove, uploadData } from '@aws-amplify/storage';

const options = {
    bucket: {
        bucketName: 'amplify-d1rel1zoj4hes1-pr-gaasstoragebucket84ca08f-2bultst0zqyy',
        region: 'eu-north-1'
    }
};


export const goToFile = async (fileUrl: string | undefined) => {
    try {
        if (fileUrl) {
            const result = await getUrl({
                path: fileUrl,
                options: options
            });
            window.open(result.url.href.toString(), "_blank");
        }
        else
            alert("File not found");
    } catch (error) {
        console.error('Error getting file URL:', error);
        alert("File not found");
    }
};

// Delete functionality
export const deletefile = async (fileUrl: string | undefined) => {
    // delete file from storage if it exists
    try {
        if (fileUrl && fileUrl !== "") {
            // Assuming you have a function to delete the file
            await remove({
                path: fileUrl,
                options: options
            });
            return true;
        }
        return false
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

export const createFile = async (file: File) => {
    try {
        const uploadResult = await uploadData({
            path: `files/${file.name}`,
            data: file,
            options: options
        }).result;

        return uploadResult;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}
