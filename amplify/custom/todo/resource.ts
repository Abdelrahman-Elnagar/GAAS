import { sharedClient } from "../../shared/client";
import { createFile, deletefile } from "../file/resource";

export const createTodo = async (content: string, topic: string, description: string, file: File | null) => {
    let fileUrl = '';
    if (file) {
        const result = await createFile(file);
        fileUrl = result.path;
    }
    // Create todo with file attachment
    await sharedClient.models.Todo.create({
        content: `${content}|:|${topic}|:|${description}|:|${fileUrl}`
    });
}

export const updateTodo = async (id: string, content: string, topic: string, description: string,fileUrl: string,file: File | null) => {
    let url = fileUrl;
    if (file) {
        const result = await createFile(file);
        url = result.path;
    }
    // Update todo with file attachment
    await sharedClient.models.Todo.update({
        id,
        content: `${content}|:|${topic}|:|${description}|:|${url}`
    });

    return {
        content: content,
        topic: topic,
        description: description,
        fileUrl: url
    }
}

export const deleteTodo = async (id: string, fileUrl: string | undefined) => {
    try {
        await deletefile(fileUrl);
        await sharedClient.models.Todo.delete({ id:id });
    }catch (error) {
        console.error("Error deleting todo:", error);
    }
}