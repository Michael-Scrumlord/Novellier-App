export default function HomePage({ }) {

    return (
        <div className="home-page">
        <div className="home-page__header">
            <div>
            <h2>Your Stories</h2>
            <p>Manage your writing projects and track your progress</p>
            </div>
            <div className="home-page__actions">
            <button
                className="btn btn--glass"
                type="button"
            >
                Create Horror Example (demo feature)
            </button>
            <button
                className="btn btn--primary"
                type="button"
            >
                + New Story
            </button>
            </div>
        </div>
        </div>
    );
}
