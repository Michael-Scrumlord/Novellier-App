// I know.. does this even need its own file? I like the visual so I can see all the tools I have.

export function handleListTools(toolSpecs) {
    return (toolSpecs || []).map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
    }));
}
